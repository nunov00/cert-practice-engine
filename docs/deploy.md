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
It runs `pnpm check`, builds the app, checks it against the Cloudflare Free limits
(`docs/platform-limits.md`; the deploy stops if one would be crossed), and publishes the Worker at
`cert-practice-engine.<your-subdomain>.workers.dev`.

The feedback form needs a one-time setup by the owner (an access key secret, and
D1 permission on the API token if the first deploy asks for it): `docs/feedback.md`.

When the brand domain (knowmark.app, decision 0003; bought in roadmap phase 8) exists, add it as a custom domain on the Worker.
Deploying automatically on every merge is a later step and needs the owner's approval.
