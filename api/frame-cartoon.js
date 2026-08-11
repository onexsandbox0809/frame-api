// api/frame-cartoon.js
// Accepts: POST application/json { photo: "<image URL>", frame_id: "text", style: "text" }
// Downloads the photo from the URL, then forwards it as multipart/form-data
// to the upstream imageframing API (which only accepts form-data uploads).

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const UPSTREAM_URL = 'https://api.imageframing.thq.digital/api/v1/frame-cartoon';

export default async function handler(req, res) {
  // CORS (optional — remove if you don't need browser access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { photo, frame_id, style } = req.body || {};

    // Validate inputs
    if (!photo || typeof photo !== 'string') {
      return res.status(400).json({ error: '"photo" is required and must be a valid image URL string.' });
    }
    if (!frame_id || typeof frame_id !== 'string') {
      return res.status(400).json({ error: '"frame_id" is required and must be a text string.' });
    }
    if (!style || typeof style !== 'string') {
      return res.status(400).json({ error: '"style" is required and must be a text string.' });
    }

    // 1. Download the photo from the given URL
    const imageResponse = await fetch(photo);
    if (!imageResponse.ok) {
      return res.status(400).json({
        error: `Could not download photo from the given URL (status ${imageResponse.status}).`,
      });
    }
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // Try to infer a filename from the URL, fallback to photo.jpg
    let filename = 'photo.jpg';
    try {
      const pathname = new URL(photo).pathname;
      const base = pathname.split('/').pop();
      if (base && base.includes('.')) filename = base;
    } catch (_) {
      // ignore, use default filename
    }

    // 2. Build multipart/form-data to forward to the upstream API
    const form = new FormData();
    form.append('photo', new Blob([imageBuffer], { type: contentType }), filename);
    form.append('frame_id', frame_id);
    form.append('style', style);

    // 3. Call the upstream API
    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: 'POST',
      body: form,
    });

    const upstreamContentType = upstreamResponse.headers.get('content-type') || '';
    const status = upstreamResponse.status;

    if (upstreamContentType.includes('application/json')) {
      const data = await upstreamResponse.json();
      return res.status(status).json(data);
    } else {
      // In case upstream returns an image or other binary directly
      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.setHeader('Content-Type', upstreamContentType || 'application/octet-stream');
      return res.status(status).send(buffer);
    }
  } catch (err) {
    console.error('frame-cartoon proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
