# frame-cartoon JSON proxy

A tiny Vercel serverless function that wraps the upstream
`https://api.imageframing.thq.digital/api/v1/frame-cartoon` endpoint (which only
accepts `multipart/form-data`) and exposes it as a clean **raw JSON**
(`application/json`) API instead.

## How it works

1. You send a JSON body with a **photo URL** (instead of uploading a file) plus
   `frame_id` and `style` as plain text.
2. The function downloads the image from that URL on the server side.
3. It re-packages everything as `multipart/form-data` and forwards it to the
   real upstream API.
4. It returns the upstream response back to you as-is.

## Deploy (GitHub + Vercel)

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import that repo.
3. No environment variables or build settings needed — click **Deploy**.
4. Your endpoint will be live at:
   `https://<your-project>.vercel.app/api/frame-cartoon`

## Usage

### Request

```
POST /api/frame-cartoon
Content-Type: application/json
```

```json
{
  "photo": "https://example.com/path/to/your-photo.jpg",
  "frame_id": "happy_raksha_bandhan",
  "style": "anime"
}
```

### curl example

```bash
curl --location 'https://<your-project>.vercel.app/api/frame-cartoon' \
--header 'Content-Type: application/json' \
--data '{
  "photo": "https://example.com/path/to/your-photo.jpg",
  "frame_id": "happy_raksha_bandhan",
  "style": "anime"
}'
```

### Response

Whatever the upstream `api.imageframing.thq.digital` endpoint returns
(JSON or binary image) is passed straight back to you with the same
status code.

## Notes / things to check

- **`photo` must be a publicly accessible URL** — the function needs to be
  able to `fetch()` it without auth. If your images are private (e.g. behind
  signed URLs or auth headers), let me know and I can add support for that.
- Default request body size limit is set to 10 MB (`api/frame-cartoon.js` →
  `config.api.bodyParser.sizeLimit`). Increase it if your source images are
  larger.
- If the upstream API ever requires an API key/auth header, add it in the
  `fetch(UPSTREAM_URL, ...)` call as an environment variable
  (`process.env.UPSTREAM_API_KEY`) rather than hardcoding it.
