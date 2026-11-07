# Backend implementation

## Scope and status

The static Riff prototype now has a same-origin Node.js server that uses the official Supabase Auth and PostgREST APIs. It keeps a local-demo fallback. The database/auth paths require a Supabase project and values in `.env`; those credentials are intentionally not included here. No Spotify endpoint, OAuth client, recording, or artwork is used.

The environment is not configured in this workspace, so live signup, email verification, password recovery, database RLS, and account deletion have not been exercised. No automated tests were added or run. The files are implementation-ready but need the user's Supabase setup before deployment.

## Setup

1. Create a Supabase project under the user's own account.
2. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, a Postgres `DATABASE_URL`, and a random `SESSION_SECRET` with at least 32 characters. `SUPABASE_SERVICE_ROLE_KEY` is optional except for account deletion; it must remain server-only. Set `APP_ORIGIN` to the exact public origin and `HOST=0.0.0.0` on a hosted container.
3. In Supabase Auth settings, set the Site URL to `APP_ORIGIN`, allow the `/auth/callback` redirect, enable email/password, and enable email confirmation. Write original confirmation and recovery email templates in the Supabase dashboard.
4. Install the PostgreSQL command-line tools (`psql`) from the official PostgreSQL distribution if they are not already available, then run `npm run db:migrate`. It applies numbered migration files transactionally and tracks them in `public.schema_migrations`. The files can also be run manually in order through the Supabase SQL editor. The catalog seed is fictional metadata only; its `audio_key` values point to no recording.
5. Run `npm start`. The server uses only Node built-ins; no npm package install is required.
6. Before public launch, enable and verify Supabase backups, set production HTTPS and `NODE_ENV=production`, and publish a privacy policy naming Supabase and the hosting provider.

## Implemented API

| method and path | purpose | access |
| --- | --- | --- |
| `GET /api/health` | Report whether server configuration is present | Public; reveals only configured/demo mode |
| `POST /api/auth/signup` | Email/password signup with verification redirect | Public, rate limited |
| `POST /api/auth/login` | Sign in and issue an encrypted HttpOnly session cookie | Public, rate limited |
| `POST /api/auth/recover` | Request recovery email with non-enumerating response | Public, rate limited |
| `GET /auth/callback` | Verify Supabase token hash and set session cookie | Supabase email link |
| `GET /api/auth/me` | Read minimal account profile | Session cookie |
| `POST /api/auth/logout` | Revoke session and clear cookie | Session cookie |
| `PATCH /api/auth/password` | Update password for signed-in account | Session cookie |
| `PATCH /api/auth/profile` | Update display name | Session cookie |
| `DELETE /api/auth/account` | Permanently delete the signed-in Auth user and cascading private rows | Session cookie plus server-only service role key |
| `GET /api/library/saved` | Read saved media IDs | Session; RLS |
| `PUT/DELETE /api/library/saved/:mediaId` | Save or remove a catalog item | Session; RLS |
| `GET/POST /api/library/playlists` | List or create private collections | Session; RLS |
| `GET/PATCH/DELETE /api/playlists/:id` | Read/update/delete a private collection | Owner session; RLS |
| `GET/POST /api/playlists/:id/items` | List/add collection entries | Owner session; RLS |
| `DELETE /api/playlists/:id/items/:itemId` | Remove an entry | Owner session; RLS |

All writes validate fields on the server. Private rows use the user's Supabase JWT on PostgREST calls, so RLS is checked by Postgres. Auth and database provider errors are not returned verbatim. Mutating requests with an `Origin` header must match `APP_ORIGIN`.

## Access rules and data

- Catalog reads are public for available items. Grants expose only safe metadata columns; `audio_key` and artwork storage keys are never granted to anonymous or authenticated client roles.
- Playlists, playlist items, saved items, playback sessions, queue items, and listening history have RLS policies scoped to the authenticated owner.
- Catalog seed rows use fixed fictional identities. They are not real artists or licensed content and do not create audio files.
- The app's local Web Audio tone is a UI demonstration only. No protected audio route, storage bucket, commercial streaming source, or offline download is implemented.
- Database deletion cascades a user's private library and history. Auth user deletion uses the Supabase Admin API with the service-role key on the server; no admin key is sent to the browser.

## Not in MVP

- Stripe: no subscription or payments feature in the recon scope.
- Resend/Postmark: no separate outbound email service; Supabase Auth sends its verification and recovery messages.
- Background jobs: none required by the current flows.
- OAuth: email/password only; Google/Apple identity providers are not configured.
- Spotify integration: explicitly excluded. Do not use Spotify private APIs, Spotify recordings, or Spotify OAuth credentials.

## Security checklist

- [x] Secrets are environment variables; `.env` and `.env.*` are ignored; `.env.example` contains placeholders only.
- [x] Session tokens are encrypted in a `HttpOnly`, `SameSite=Lax` cookie; production cookies use `Secure`.
- [x] Server validates auth, profile, playlist, and media IDs before requests.
- [x] Every user data operation passes the Supabase user JWT and relies on RLS.
- [x] Rate limits cover signup, login, and recovery endpoints (per-process memory limit; use a shared limiter before horizontal scaling).
- [x] Provider errors and submitted passwords/tokens are not logged; query strings are not logged.
- [x] Security headers and a same-origin content security policy are set; static serving is restricted to the app shell assets.
- [x] Audio/artwork storage keys are withheld from public roles.
- [x] Admin service role is used only for account deletion and remains server-side.
- [ ] Configure an actual Supabase project, Auth redirect allowlist, confirmation and recovery templates, HTTPS host, and secrets.
- [ ] Test authorization with at least two users and confirm cross-user reads/writes are denied before launch.
- [ ] Confirm daily database backups and the provider's retention/deletion behavior.
- [ ] Publish a privacy policy listing Supabase and the hosting provider.
- [ ] Review dependency vulnerabilities before introducing third-party packages. The current server uses Node built-ins and has no runtime package dependencies.
- [ ] Implement a protected storage playback route only after the catalog and delivery rights are established.

## Feature matrix update

Email/password account access is now implemented in code but remains `partial` until the user configures Supabase and completes a real verification/recovery flow. Playlist and saved-item persistence is available through authenticated routes; local browser behavior remains the demo fallback. Playback continues to be generated tone only.
