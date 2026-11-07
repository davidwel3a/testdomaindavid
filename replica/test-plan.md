# Test plan: Riff listening demo

Build: local workspace (no Git repository) · Date: 2026-10-26 · Env: local demo seed; Supabase is not configured

The UI click-through was not run. A prior browser security decision blocked local `file://` interaction and prohibited switching to Playwright or another browser surface for the same UI task. Supabase-dependent cases also need the user's own project. Cases below are ready for a manual pass in a browser at `http://localhost:3000` after `npm start`.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | Find and play a track | happy | Open Home → Search → search “Paper Lanterns” → open result → play | Matching result appears; player shows the selected sample and advances its position | manual | not run |
| F01-E1 | Find and play a track | edge: no result | Search for a unique nonexistent phrase | Empty-result message appears; app remains usable | manual | not run |
| F01-E2 | Find and play a track | edge: accents/emoji | Search for “Mira Sol” and an emoji query | Accent query finds the artist's sample; emoji query returns no result without an error | manual | not run |
| F01-E3 | Find and play a track | edge: long input | Paste a 200-character query | Input remains usable; no crash or unrelated match | manual | not run |
| F01-E4 | Find and play a track | edge: refresh/back | Search, open a result, use Back, then refresh | Navigation returns to a valid screen; search state behavior is understood and consistent | manual | not run |
| F01-E5 | Find and play a track | edge: network/audio | Disconnect network, then select a sample; test browser without Web Audio support if available | Local search still works; player gives a clear playback error if audio APIs are absent | manual | not run |
| F01-E6 | Find and play a track | edge: concurrent tabs | Open two app tabs; search in one, play in the other | No uncaught errors; current persistence behavior across tabs is recorded | manual | not run |
| F01-E7 | Find and play a track | edge: mobile/keyboard/a11y | At 390px, complete search and play using keyboard only; inspect labels with a screen reader | Search and playback controls remain reachable, named, and visible | manual | not run |
| F01-N1 | Find and play a track | negative: deleted/unavailable item | Open `#/track/not-a-real-id` | Friendly unavailable state appears; no exception | manual | not run |
| F02-H1 | Save a track for later | happy | Play a sample → save it → open Your Library → Saved tracks | Track appears in Saved tracks and is marked saved | manual | not run |
| F02-E1 | Save a track for later | edge: empty library | Remove all saved tracks | Empty-library state appears and offers a path back to Search | manual | not run |
| F02-E2 | Save a track for later | edge: repeat/refresh | Save, refresh, then unsave | Local demo retains state after refresh; button state follows each action | manual | not run |
| F02-E3 | Save a track for later | edge: two tabs/double activation | Rapidly click save twice, then inspect a second tab | No duplicate saved rows; document whether local storage updates in the second tab without refresh | manual | not run |
| F02-E4 | Save a track for later | edge: slow/offline | Save while offline or throttled | UI gives feedback and does not falsely claim a server save in configured mode | manual | not run |
| F02-E5 | Save a track for later | edge: mobile/keyboard/a11y | Save and find a track at 390px using keyboard only | Save control has an item-specific accessible name and visible focus | manual | not run |
| F02-N1 | Save a track for later | negative: signed-out backend | With Supabase configured, sign out and attempt save | User is routed to sign-in; no private mutation occurs | manual | requires Supabase |
| F02-N2 | Save a track for later | negative: second user | Save as User A, sign in as User B | User B cannot read User A's saved items | manual | requires two Supabase users |
| F03-H1 | Create a playlist and add a track | happy | Library → New collection → enter name → create → add a sample | New collection opens with the selected item after adding | manual | not run |
| F03-E1 | Create a playlist and add a track | edge: empty/cancel | Submit a blank name; reopen and cancel | Blank name is blocked; cancel closes dialog without creating a collection | manual | not run |
| F03-E2 | Create a playlist and add a track | edge: long name | Create with exactly 100 characters; try 101 | 100-character name is accepted and displayed without overflow; more than 100 is blocked | manual | not run |
| F03-E3 | Create a playlist and add a track | edge: accents/emoji | Create “Café 🌙” and add a sample | Name is retained and safely rendered | manual | not run |
| F03-E4 | Create a playlist and add a track | edge: refresh/back/two tabs | Create and add, refresh, use Back, inspect another tab | Persisted demo state survives refresh; route remains valid; cross-tab behavior is recorded | manual | not run |
| F03-E5 | Create a playlist and add a track | edge: empty playlist | Create but add nothing | Empty state is clear; add recommendations are available | manual | not run |
| F03-E6 | Create a playlist and add a track | edge: concurrent append | With backend configured, add from two tabs at once | Appends serialize to distinct positions; no entry is lost | manual | requires Supabase |
| F03-E7 | Create a playlist and add a track | edge: mobile/keyboard/a11y | Create and add at 390px using keyboard only | Dialog traps focus, Escape closes, labels and focus are usable | manual | not run |
| F03-N1 | Create a playlist and add a track | negative: permission/deleted record | As User B, edit/delete User A's collection; then open a deleted collection | Mutations are denied; deleted collection shows not-found state | manual | requires Supabase |
| F04-H1 | Play and shape a queue | happy | Open a collection → play it → add a track to queue → open Queue | Current item and upcoming item appear in the queue drawer | manual | not run |
| F04-E1 | Play and shape a queue | edge: empty queue | Open Queue before adding anything | Clear empty state appears | manual | not run |
| F04-E2 | Play and shape a queue | edge: remove/refresh | Add two items, remove one, refresh | Removed item disappears; record current queue persistence behavior | manual | not run |
| F04-E3 | Play and shape a queue | edge: stale/unavailable item | Queue an item, then remove it from seed/catalog before playback | Player handles missing item without crashing | manual | not run |
| F04-E4 | Play and shape a queue | edge: mobile/keyboard/a11y | Open and close queue at 390px using keyboard | Drawer is reachable and dismissible; controls have names | manual | not run |
| F04-N1 | Play and shape a queue | negative: deleted collection | Open a deleted collection URL and attempt play | Not-found state appears; playback does not start from the missing collection | manual | not run |
| F05-H1 | Resume recent listening | happy | Play a sample → Home | Recent listening shelf contains the played sample | manual | not run |
| F05-E1 | Resume recent listening | edge: empty history | Use a fresh browser profile → Home | Recent shelf is omitted cleanly; recommendations still render | manual | not run |
| F05-E2 | Resume recent listening | edge: refresh/back/two tabs | Play, refresh, return Home, inspect another tab | Recent items persist in local demo; cross-tab update behavior is recorded | manual | not run |
| F05-E3 | Resume recent listening | edge: offline/deleted item | Remove or make a recent item unavailable, then return Home | Missing item is skipped or shown as unavailable without breaking the page | manual | not run |
| F05-E4 | Resume recent listening | edge: mobile/keyboard/a11y | Resume a recent item at 390px with keyboard only | Card is reachable, named, and can start playback | manual | not run |
| F05-N1 | Resume recent listening | negative: second user | Play as User A, sign in as User B | User B does not see User A's history | manual | requires two Supabase users |
| AUTH-N1 | Account access | negative: wrong password | Configure Supabase, submit an incorrect password | Generic sign-in error appears; no session is issued | manual | requires Supabase |
| AUTH-E1 | Account access | edge: expired session/recovery | Expire session, then use recovery email and set a new password | Expired cookie is cleared; verified recovery flow returns to account page | manual | requires Supabase email |

## Not applicable

- Time zones and daylight saving: no scheduling feature.
- Payment/card-declined scenarios: payments are outside MVP scope.
- OAuth provider approval: email/password only; OAuth is not configured.
- Permission-denied media: the demo has no licensed catalog or storage delivery; signed playback URLs are not implemented.

## Manual pass instructions

Start the server with `npm start` after configuring `.env`, or use the browser-only file build for demo flows. For local auth and library persistence, use `http://localhost:3000`; a `file://` page cannot reach the API. Use a fresh browser profile for empty-state cases. Do not use real passwords in test notes. Fill in the result column and share the failures/evidence to continue the fix loop.

## Checks completed in this pass

- JavaScript syntax checks for `app.js`, `server.js`, and `scripts/migrate.js`: passed (`node --check`).
- UI flow cases: not run.
- Local HTTP smoke cases: not run; the sandbox denied localhost socket access, and no execution result was returned for the elevated request.
- Supabase auth/RLS cases: not run; no Supabase `.env` or two test accounts are configured.
