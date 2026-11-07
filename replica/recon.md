# Recon map: Spotify (web)

Scope: Core web-player loop: discover or search music, play a track, save it, and organize/play it in a playlist. Covers signed-in library features and public web-player entry; excludes full catalog and commercial audio delivery.
For: A clean-room, independently branded listening product for the user's own business or niche, using audio it has rights to stream.
Date: 2026-10-26

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Spotify Support: Web player help | https://support.spotify.com/us/article/web-player-help/ | Browser web-player entry and supported browsers; help pages do not expose a full screen-by-screen guest flow. |
| 2 | Spotify Support: Now Playing view | https://support.spotify.com/us/article/now-playing/ | Playback controls, save, shuffle, repeat, queue and device selection. |
| 3 | Spotify Support: Create and edit playlists | https://support.spotify.com/ie/article/create-playlists/ | Create, add, remove, reorder, delete playlist behavior on desktop/web. |
| 4 | Spotify Support: Your Premium benefits | https://support.spotify.com/us/article/your-premium-benefits/ | Subscription-gated listening, offline and group listening capabilities; plan details vary by market and change over time. |
| 5 | Spotify Support: Your Library / feature index | https://support.spotify.com/us/ | Public inventory includes Search, Your Library, queue, sort/filter, recent activity, shuffle and more. |
| 6 | Spotify for Developers: Web API | https://developer.spotify.com/documentation/web-api | Public metadata and user-authorized library/playback capabilities; current endpoint access and policy restrictions must be checked before implementation. |
| 7 | Spotify for Developers: Playlists | https://developer.spotify.com/documentation/web-api/concepts/playlists | Playlist order, public/private, collaborative and following concepts. |
| 8 | Spotify for Developers: Get Playlist | https://developer.spotify.com/documentation/web-api/reference/get-playlist | Playlist metadata, ownership, visibility, items and paging evidence. |
| 9 | Spotify for Developers: API calls | https://developer.spotify.com/documentation/web-api/concepts/api-calls | OAuth and user permission required for private profile/playlist data. |
| 10 | Spotify for Developers: Get currently playing track | https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track | Playback state and OAuth scope; explicitly notes streaming integrations cannot be commercial. |
| 11 | Spotify for Developers: February 2026 Web API changes | https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide | Current endpoint changes; API surface is version-sensitive. |

## Core loop

Find music through home recommendations or search, start playback, then save tracks or add them to a playlist so they are easy to play again.

## Screens

These screens are inferred from official public help and API docs, not a live authenticated walkthrough. Exact web layout, route patterns, and some states need confirmation against a user-owned account before pixel-level design.

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Sign in / account entry | Open open.spotify.com; choose log in or sign up | Establish account session | Brand header, email/social entry, form, validation | Signed out, invalid credentials (inferred), loading (inferred), error (inferred) |
| S02 | Home / recommendations | Web player root after sign-in | Resume listening and surface mixes, recent items and recommendations | Global nav, recommendation cards, recent items, content shelves, player bar | Filled personalized (inferred from service), loading/error (inferred), signed-out gate (inferred) |
| S03 | Search | Global Search navigation | Find tracks, albums, artists, playlists, shows | Search input, suggestion list, category/result sections | Empty query, suggestions/results (inferred), no results/error (inferred) |
| S04 | Search results / entity detail | Select a result | Browse and play tracks, albums or artist collections | Entity header, result/track rows, play/save/more actions | Filled, unavailable or market-restricted item (API evidence), loading/error (inferred) |
| S05 | Your Library | Global library navigation | Find saved tracks, albums, artists and playlists | Library sidebar/list, filters/sort, create control | Empty library (inferred), populated, loading/error (inferred) |
| S06 | Playlist detail | Select a playlist in Library or search | Play and manage ordered tracks | Cover/header, play/shuffle, track list, add/recommendations, more menu | Empty playlist, populated, unavailable tracks, collaborative state; loading/error inferred |
| S07 | Now Playing / persistent player | Start a track; persistent player and expanded Now Playing | Control current playback and inspect what is playing | Artwork, title/artist, play/pause, previous/next, seek, volume, save, shuffle, repeat, queue/device controls | Playing, paused, saved/unsaved, queue, unavailable (inferred), error (inferred) |
| S08 | Queue | Queue control from player | Inspect and change upcoming playback | Now-playing item, up-next list, reorder/remove controls (exact web actions inferred) | Empty queue (inferred), populated, loading/error (inferred) |
| S09 | Create playlist | Library create control | Create a named collection | Name field, create/save, cancel | Empty form, validation, created; exact dialog presentation inferred |
| S10 | Add to playlist chooser | Track context menu / add control | Save a track into a chosen playlist | Playlist list, selection, confirmation/toast | No playlists, available playlists, success/error (inferred) |
| S11 | Account / settings and plan | Profile menu | Manage account preferences and subscription | Profile menu, settings navigation, plan status | Signed-in, loading/error (inferred); details excluded from core loop |

## Flows

```
F01 Find and play a track
    S02 -> S03 -> S04 -> S07
    happy path clicks: ~4 navigational actions (search, enter query, choose result, play); exact count depends on keyboard entry and result layout
    edge: no results, network failure, unavailable in market, restricted content, playback permission/device error

F02 Save a track for later
    S07 -> S05
    happy path clicks: 1 save action; library confirmation/state change follows
    edge: save action unavailable, item already saved, stale session, request error

F03 Create a playlist and add a track
    S05 -> S09 -> S06 -> S10 -> S06
    happy path clicks: ~5 (create, name/save, open track menu, choose add, select playlist)
    edge: blank/duplicate name, cancel, empty playlist, no eligible tracks, failed mutation, concurrent playlist update

F04 Play and shape a queue
    S06 -> S07 -> S08 -> S07
    happy path clicks: ~3 (play, open queue, choose/reorder next item); exact queue editing gestures are inferred for web
    edge: queue empty, track removed/unavailable, playback changes on another device, stale queue, network loss

F05 Resume recent listening
    S02 -> S07
    happy path clicks: 1 select recent item
    edge: no history/recent items, item unavailable, signed-out state, recommendations fail to load
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Global navigation | Home, Search, Library; collapsed/expanded (responsive inference) | active, inactive, hover, focus | S02-S06 |
| Search field | idle, focused, query entered | empty, suggestions, results, no results, error | S03-S04 |
| Content card | track/album/artist/playlist | default, hover, selected, unavailable | S02-S06 |
| Track row | standard, compact, context-menu enabled | idle, hover, playing, saved, unavailable, menu open | S04, S06-S08 |
| Playback control | play/pause, previous/next, shuffle, repeat | enabled, disabled, active, loading | S06-S08 |
| Persistent player | compact bar, expanded Now Playing | playing, paused, no item, buffering/error | S02-S08 |
| Progress/volume slider | seek, volume | current, dragging, keyboard focus, disabled | S07 |
| Queue list | current item, upcoming items | empty, populated, reordering (web inference) | S08 |
| Playlist action menu | create, add, remove, share/more | open, closed, pending, success/error | S05-S06, S10 |
| Playlist editor | create, rename, description/visibility (some inferred) | blank, editing, validation, saving, saved/error | S09 |
| Toast/inline notice | success, warning, error | transient, dismissed | S05-S10 |
| Auth form | sign-in/sign-up | pristine, invalid, submitting, error, success | S01 |

## Inferred data model

```
User  id, display_name, email (private), country/market, plan_tier, preferences
      evidence: S01/S11, OAuth-protected user data in API docs
      confidence: medium

Track  id, title, duration, explicit, availability/restriction, artist_ids, album_id, external_reference
       evidence: S04/S06/S07, Get Track and playlist item API docs
       confidence: high for catalog metadata fields; playback rights/provider fields are guesses

Artist  id, name, external_reference
        evidence: S04; API docs list artist catalog resources
        confidence: medium

Album  id, title, artist_ids, release metadata, artwork_reference, track_ids
       evidence: S04/S06, track and playlist API object definitions
       confidence: medium

Playlist  id, owner_user_id, name, description, visibility, collaborative, snapshot/version, artwork_reference
          evidence: S05/S06/S09, playlist concepts and Get Playlist reference
          confidence: high

PlaylistItem  playlist_id, position, track_id or episode_id, added_at, added_by_user_id
              evidence: S06/S08 and playlist item response fields
              confidence: high

SavedItem  user_id, track_id or album_id or artist_id, saved_at
           evidence: S05/S07 save action; exact persistence representation inferred
           confidence: medium

PlaybackSession  user_id, current_item_id, context_id, position_ms, is_playing, shuffle, repeat_mode, device_id, updated_at
                evidence: S07/S08 player API resources
                confidence: medium

QueueItem  playback_session_id, item_id, position
           evidence: S08 and Get User's Queue API resource
           confidence: medium
```

Relationships: User 1-n Playlist; Playlist 1-n PlaylistItem; PlaylistItem n-1 Track or Episode; User n-n Track/Album/Artist through SavedItem; User 1-n PlaybackSession; PlaybackSession 1-n QueueItem; Track n-n Artist; Album 1-n Track (simplified; compilations and credits can be many-to-many).

## Feature matrix

See `features.csv`. Must: 10, should: 7, could: 5, skip: 5.

## Out of scope (cannot or should not be cloned)

- Spotify's licensed catalog, master recordings, artwork and editorial copy. Use original or independently licensed audio and assets.
- Spotify's user network, proprietary recommendations and listening-history dataset. Recreate equivalent UX using the clone's own data and algorithms.
- Spotify branding, logos, proprietary UI artwork and trade dress. Implement a distinct brand and visual system.
- Spotify's commercial streaming integration through the Spotify Platform; its public API policy says streaming integrations may not be commercial, and content cannot be downloaded or altered. Do not build a commercial clone that streams Spotify content; verify current developer terms before any integration.
- Premium subscription entitlements, audiobook catalog, partner bundles and device ecosystem. These depend on Spotify's commercial and licensing arrangements.

## Size

Screens 11, flows 5, entities 9. Hard parts: licensed audio catalog and delivery, responsive low-latency playback/queue synchronization, discovery/recommendations, identity and library sync, entitlement and market restrictions. Size: XL for a full streaming service; M for a narrow prototype with owned/licensed sample audio, basic search, playlists and a single-device player.
