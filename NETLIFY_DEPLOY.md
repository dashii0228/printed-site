# Netlify deployment

The repository is a pnpm monorepo. Netlify reads `netlify.toml` from the
repository root; the file configures the Vite build, the Express Function, API
rewrites, and SPA route fallback.

The prepared source copy is in `generated-artifacts/printed-netlify-site/`.
It excludes local dependencies, Replit-only files, attached uploads, and
secrets. For the full site, deploy that folder through a Git-connected Netlify
site or the Netlify CLI. Netlify's drag-and-drop deploy is for static files and
will not deploy the API Function.

## Netlify environment variables

Set these in the Netlify site’s environment-variable settings, not in this
repository:

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web build | Publishable key for the separate Clerk application. |
| `CLERK_PUBLISHABLE_KEY` | API Function | Same Clerk application as the web key. |
| `CLERK_SECRET_KEY` | API Function | Secret key for that Clerk application. |
| `CLERK_FIRST_ADMIN_EMAIL` | API Function | Email that receives the initial admin role. |
| `DATABASE_URL` | API Function | Replit production PostgreSQL connection string; use SSL. |
| `STORAGE_PROVIDER` | API Function | Set to `r2`. |
| `R2_ACCOUNT_ID` | API Function | Cloudflare account that owns the bucket. |
| `R2_BUCKET_NAME` | API Function | Private R2 bucket name. |
| `R2_ACCESS_KEY_ID` | API Function | R2 S3-compatible access key. |
| `R2_SECRET_ACCESS_KEY` | API Function | R2 S3-compatible secret. |

Do not commit secret values or send them in chat. `PORT`, `BASE_PATH`, and the
Node version are already set in `netlify.toml`. Leave `VITE_CLERK_PROXY_URL`
unset when using the separate Clerk application.

## Before the first deploy

1. Import the repository into Netlify from its root directory.
2. Create a private Cloudflare R2 bucket and an S3-compatible key restricted to
   object read/write for that bucket. Add the key values to Netlify’s settings.
3. Configure the bucket’s CORS to allow `PUT` from the final Netlify site origin
   with the `Content-Type` header.
4. Add the Replit production database connection string to Netlify as
   `DATABASE_URL`; keep the SSL requirement enabled.
5. Configure the separate Clerk application for the Netlify domain and enable
   public signup. Add its publishable and secret keys to Netlify.

Replit’s managed App Storage is not used in Netlify mode. Local Replit runs keep
using App Storage unless `STORAGE_PROVIDER=r2` is set. Netlify image uploads use
short-lived signed R2 URLs, and image reads redirect to short-lived signed
downloads.
