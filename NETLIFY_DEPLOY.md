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
| `STORAGE_PROVIDER` | API Function | Set to `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` | API Function | Cloud name from the Cloudinary dashboard. |
| `CLOUDINARY_API_KEY` | API Function | API key for that cloud. |
| `CLOUDINARY_API_SECRET` | API Function | Secret for the same API key; keep server-side only. |

Do not commit secret values or send them in chat. `PORT`, `BASE_PATH`, and the
Node version are already set in `netlify.toml`. Leave `VITE_CLERK_PROXY_URL`
unset when using the separate Clerk application.

## Before the first deploy

1. Import the repository into Netlify from its root directory.
2. Create a free Cloudinary Image & Video API account and add its cloud name,
   API key, and API secret in Netlify. Set `STORAGE_PROVIDER=cloudinary`.
3. No unsigned upload preset or custom bucket CORS policy is required.
4. Add the Replit production database connection string to Netlify as
   `DATABASE_URL`; keep the SSL requirement enabled.
5. Configure the separate Clerk application for the Netlify domain and enable
   public signup. Add its publishable and secret keys to Netlify.

Local Replit runs keep using App Storage unless a provider is explicitly set.
Cloudinary uploads go directly from the administrator's browser to Cloudinary
using signed multipart POST requests. The API verifies the resource, format,
and 8 MB limit before returning a permanent HTTPS CDN URL for the database.
Never prefix the Cloudinary API secret with VITE_ or commit it to Git.

Deploy this updated code once, after saving the environment variables.
Afterward, product and portfolio image changes made through the admin editor
do not require another deploy. Existing bundled images stay unchanged.
Previously uploaded Replit App Storage or R2 files are not automatically copied
to Cloudinary; any existing edits referencing those stores must be migrated or
re-uploaded before retiring their old storage. Replaced images are not deleted
automatically, so periodically review unused assets in Cloudinary.

R2 remains an optional supported provider for existing installations. It is not
needed for the Cloudinary setup above.
