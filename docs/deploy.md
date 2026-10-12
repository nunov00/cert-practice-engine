# Deploying the app

Hosting: Cloudflare Workers (decision 0002). Nothing is deployed automatically yet.

## Local

```
pnpm install
pnpm --filter @cpe/app dev        # Next.js dev server on :3000
pnpm --filter @cpe/app preview    # production build running in the local Workers runtime
```

## Deploying

The Cloudflare account ID is in `app/wrangler.jsonc` (it isn't secret). The API token
is the GitHub Actions secret `CLOUDFLARE_API_TOKEN` (created from Cloudflare's
**Edit Cloudflare Workers** template); it is never committed or pasted in chat.

To deploy: GitHub, then **Actions**, then **deploy**, then **Run workflow** on `main`.
It runs `pnpm check`, builds the app, and publishes the Worker at
`cert-practice-engine.<your-subdomain>.workers.dev`.

When the brand domain (knowmark.app, decision 0003) is bought, add it as a custom domain on the Worker.
Deploying automatically on every merge is a later step and needs the owner's approval.
