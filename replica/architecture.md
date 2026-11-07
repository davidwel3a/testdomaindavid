# Architecture: Independent listening app (Spotify core features)

Scope: Responsive web player for a rights-cleared catalog. Users search and play audio, save items, create playlists, and manage a single-device queue. This is not a Spotify client or a commercial Spotify streaming integration.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Static HTML/CSS/JavaScript served by the same-origin Node.js server | Keeps the existing prototype running without a framework rewrite or runtime packages; API and app share one origin. |
| styling | Existing CSS design tokens | Applies the original neutral design system already built for the prototype. |
| database | Supabase Postgres | Managed relational data, Auth integration, indexes and row-level security. |
| ORM | None; explicit Supabase PostgREST requests and checked-in SQL migrations | Keeps the small MVP dependency-free and makes each database request visible. |
| auth | Supabase Auth REST API with encrypted HttpOnly session cookie | Password and verification flows run server-side; credentials and refresh tokens stay out of browser JavaScript. |
| payments | None in the first slice | No paid entitlement or subscription scope in the recon. Add Stripe only after pricing and licensed catalog rights are settled. |
| email | Supabase Auth email templates | Used only for verification and recovery; customize the copy in the user's Supabase project. |
| jobs | None in MVP | No scheduled tasks are required for the current flows. |
| files | Private Supabase Storage planned, not enabled | Add only for audio and artwork the product has rights to serve; a protected playback route is not implemented yet. |
| hosting | Any Node.js host with HTTPS (for example Render) | Runs the built-in Node HTTP server; set `HOST=0.0.0.0` for container hosting. |

One application and one Postgres database; no microservices. `server.js` uses Node built-ins only. Supabase SQL migrations are the source of truth for database changes. The prototype falls back to browser-local demo data when Supabase is not configured.

## Schema

Tables: 10. Access rules: Supabase Postgres RLS. See [schema.sql](schema.sql). Catalog rows are read-only to clients; ingestion and edits use a trusted server-side service role. Private object keys are not returned by public catalog queries. A server playback endpoint checks item availability and entitlement before returning a short-lived signed URL.

Table summary: `artists`, `albums`, `media_items`, `media_item_artists`, `playlists`, `playlist_items`, `saved_items`, `playback_sessions`, `queue_items`, `listening_history`.

Key constraints:

- Playlist and queue positions are unique per parent and deferrable so reordering can update positions in one transaction.
- Playlist names are nonblank and bounded; media duration and playback position cannot be negative.
- Saved media items are unique per user. Playlist membership may repeat a media item intentionally, matching ordinary playlist behavior.
- Removing a user cascades their private playlists, saved items, playback sessions and listening history. Playlist item rows cascade with playlists; media deletion is restricted while referenced by a playlist/queue, and catalog cleanup must explicitly resolve those references.
- Playback position and history timestamps use UTC `timestamptz`.

## API

App routes use server handlers/actions. Every authenticated mutation derives the user from the verified Supabase session, never from a submitted user ID. Inputs are validated server-side; outputs omit storage keys and return only fields required by the UI.

The current implementation uses the same-origin routes documented in [backend.md](backend.md). It covers email auth and private saved-item/playlist persistence. Search, playback, queue, listening-history APIs and protected audio delivery remain planned; the prototype still uses its local demo catalog and generated audio.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET `/` | Home shelves and recent items | Public catalog; recent section signed-in | page cursor | cards, recent items | F05 |
| GET `/search?q=` | Search tracks, albums, artists and public playlists | Public | query, cursor | grouped results | F01 |
| GET `/api/media/:id` | Read available item metadata | Public | item ID | item and credits | F01 |
| POST `/api/playback/sessions` | Start item/context and create or reuse user's session | Signed-in | media ID, optional playlist/context | session state | F01, F04 |
| PATCH `/api/playback/sessions/:id` | Persist pause/play, seek, shuffle, repeat and current item | Session owner | state patch, expected `updated_at` | updated session or conflict | F01, F04 |
| POST `/api/playback/sessions/:id/next` | Advance playback, respecting queue/context | Session owner | optional expected version | current item/session | F04 |
| POST `/api/playback/sessions/:id/previous` | Return to previous item or restart current | Session owner | optional expected version | current item/session | F04 |
| GET `/api/playback/sessions/:id/stream/:mediaId` | Authorize and issue short-lived signed URL | Session owner | media ID | signed URL and expiry | F01, F04 |
| GET `/api/playback/sessions/:id/queue` | Get current and upcoming items | Session owner | session ID | current item, ordered queue | F04 |
| POST `/api/playback/sessions/:id/queue` | Append media item to queue | Session owner | media ID | queue item and new version | F04 |
| PATCH `/api/playback/sessions/:id/queue/:itemId` | Move queue item | Session owner | target position, expected version | ordered queue | F04 |
| DELETE `/api/playback/sessions/:id/queue/:itemId` | Remove upcoming queue item | Session owner | item ID | updated queue | F04 |
| GET `/api/library/saved` | List saved items | Signed-in | cursor, sort | saved item cards | F02 |
| PUT `/api/library/saved/:mediaId` | Save item (idempotent upsert) | Signed-in | media ID | saved state | F02 |
| DELETE `/api/library/saved/:mediaId` | Unsave item | Signed-in | media ID | 204 | F02 |
| GET `/api/library/playlists` | List owned playlists | Signed-in | cursor/sort | playlist summaries | F03 |
| POST `/api/library/playlists` | Create playlist | Signed-in | name, optional description | playlist | F03 |
| GET `/api/playlists/:id` | Read playlist and ordered items | Owner (public/unlisted read policy can be added separately) | cursor | playlist and items | F03, F04 |
| PATCH `/api/playlists/:id` | Rename or update description | Owner | fields, expected version | updated playlist | F03 |
| DELETE `/api/playlists/:id` | Delete playlist | Owner | playlist ID | 204 | F03 |
| POST `/api/playlists/:id/items` | Add media item at end or position | Owner | media ID, optional position, idempotency key | item and version | F03 |
| DELETE `/api/playlists/:id/items/:itemId` | Remove playlist item | Owner | item ID, expected version | updated playlist version | F03 |
| PATCH `/api/playlists/:id/items/reorder` | Reorder playlist items atomically | Owner | ordered item IDs, expected version | new version and item order | F03 |
| GET `/api/history/recent` | Read recent listening history | Signed-in | cursor | recent items | F05 |
| POST `/api/history` | Record a play or completion (deduplicated) | Signed-in | media ID, event ID, played time | accepted event | F05 |

Webhooks in: Supabase Auth user lifecycle webhook only if profile cleanup or welcome flow is added. Webhooks out: none in MVP.

Jobs: none in MVP. Later: nightly listening-history retention/aggregation and recommendation refresh; run via Vercel Cron with an authenticated endpoint and idempotent batch processing.

## The parts that bite

- Time zones: timestamps are stored as UTC `timestamptz`. The UI formats local display only; no calendar-style local scheduling is in scope.
- Idempotency: save/unsave operations are naturally idempotent. Playlist additions and listening events accept a client request/event ID and use a unique dedupe key if retry safety is needed. Auth or future billing webhooks must record provider event IDs before side effects.
- Races: playlist/queue reorder and concurrent edits use `version` optimistic locking. In a transaction, defer position uniqueness, shift rows, increment parent version, and reject stale `expected_version` with 409.
- Search: use Postgres full-text indexes for initial catalog size; add trigram indexes for typo tolerance only after validating queries. Paginate deterministically and keep public catalog ingestion outside client roles.
- Realtime: not required for one-device MVP. If collaborative playlists or cross-device sync are added, use Supabase Realtime as an update signal while Postgres remains authoritative.
- Offline: no audio downloads in first slice. Browser media buffering is not a persistent offline feature; downloads require explicit rights and protected delivery design.
- Storage: audio and artwork live in private buckets. Validate upload size/type at trusted ingestion, scan uploads if user uploads are later allowed, and avoid logging signed URLs.
- Rate limits: cap search and playback URL issuance per user/IP; use provider limits only for future official integrations. Do not call private Spotify endpoints.
- Email deliverability: no transactional email in MVP. If added, configure SPF/DKIM/DMARC and retry through a provider.
- Multi-tenancy: private rows are user-scoped with RLS. Public playlist reads require a carefully scoped policy; do not make all playlist rows public by default.
- GDPR deletion: deleting a Supabase Auth user cascades personal data. Establish retention and audit requirements before launch; storage objects and backups need a documented deletion lifecycle.
- Rights and playback: the hardest product dependency is a catalog and delivery rights that permit the intended use. Spotify's catalog and Spotify Platform streaming cannot be substituted into a commercial clone. The app must only expose licensed or user-owned audio.

## Build order

1. **Backend setup.** Create the user's Supabase project, configure `.env`, apply both migrations and verify email confirmation/recovery. Screens S01/S11; Auth routes in `backend.md`.
2. **Persisted library slice.** Screens S05/S06/S09/S10; tables `playlists`, `playlist_items`, `saved_items`; authenticated library routes are implemented. Confirm RLS with two accounts before launch.
3. **Catalog and playback service.** Screens S02-S04/S07/S08; add search, playback sessions, queue/history endpoints and a signed storage playback route only after rights-cleared audio is available.
4. **Finish library parity.** Playlist item removal UI, transactional reorder, filter/sort, loading/error states and responsive screenshot review.
5. **Could-haves.** Collaborative playlists and public sharing only after access model, invitation flows and concurrency rules are designed. Do not add Spotify Connect or offline Spotify catalog downloads.
6. **Fixes from replica-entrepreneur.** Reprioritize only after research; preserve licensing and data-access boundaries.

## Summary

Stack: static HTML/CSS/JavaScript + Node built-in HTTP server + Supabase Postgres/Auth. Tables: 10. Implemented API operations: 21. Riskiest parts: rights-cleared audio supply and delivery; session/key configuration; authorization and concurrent playlist edits. Next step after configuring Supabase: `/replica-test`.
