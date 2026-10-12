# Deploying the app

Hosting: Cloudflare Workers (decision 0002). Nothing is deployed automatically yet.

## Local

```
pnpm install
pnpm --filter @cpe/app dev        # Next.js dev server on :3000
pnpm --filter @cpe/app preview    # production build running in the local Workers runtime
```

## First deploy (owner, once)

1. In Cloudflare, create an API token from the **Edit Cloudflare Workers** template,
   scoped to this account.
2. Note the **account ID** (Workers & Pages overview page).
3. Share both through a secure channel (not in the repo or chat). They are stored as
   the environment/CI secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. `pnpm --filter @cpe/app deploy` publishes the Worker at
   `cert-practice-engine.<account>.workers.dev`.
5. When the brand domain exists (decision D5), add it as a custom domain on the Worker.

Automatic deploy on merge to `main` is a later step and needs the owner's approval.
