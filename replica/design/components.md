# Component specifications

These are original, accessible interaction patterns for the independently branded product. No Spotify logos, icons, artwork, licensed typefaces, or copy are reused. Use Lucide (ISC) or another permissively licensed icon set; keep icons decorative when the adjacent text already names the action.

## Button

- Variants: primary, secondary, ghost, danger, icon-only.
- Sizes: sm 32px, md 40px, lg 48px; icon targets at least 44×44px on touch layouts.
- States: default, hover, active, focus-visible, disabled, loading.
- Tokens: accent/on-accent for primary; surface/text/border for secondary; danger for destructive; radius-md; sm/600.
- A11y: native `<button>`; accessible name for icon-only; `aria-busy` while loading and retain label; disabled actions are truly disabled.
- Used on: S01, S02, S03, S05-S11.

## Global navigation

- Variants: desktop sidebar, compact/mobile navigation; Home, Search, Library destinations.
- States: active, inactive, hover, focus-visible, collapsed, unavailable/loading.
- Tokens: bg/surface, text/muted, accent active indicator, border, sm/base.
- A11y: `<nav aria-label="Main navigation">`; links, not clickable divs; `aria-current="page"`; mobile menu has a labelled toggle and Escape dismissal.
- Used on: S02-S06, S08.

## Search field and results

- Variants: global search, library filter.
- States: empty, focused, query entered, suggestions, results, no results, loading, error, disabled.
- Tokens: surface-raised, text, muted, border-input, focus, radius-pill or md.
- A11y: visible label or `aria-label`, combobox/listbox semantics only if keyboard selection is implemented, clear button named, announce result count with a polite live region.
- Used on: S03-S05.

## Content card

- Variants: track, album, artist, playlist; compact and featured.
- States: default, hover, focus, selected, unavailable, loading skeleton.
- Tokens: surface, surface-raised hover, text/muted, radius-md, card shadow.
- A11y: semantic link for navigation; image alt describes content or empty alt if adjacent text repeats it; never encode essential labels in artwork.
- Used on: S02-S06.

## Track row

- Variants: standard, compact, queue item; optional context actions.
- States: idle, hover, keyboard focus, playing, saved, unavailable, menu open, loading.
- Tokens: text/muted, surface-raised hover, accent playing marker, danger for remove action.
- A11y: play/save/more are separate buttons with item-specific names; status is not color-only; row actions are reachable without hover.
- Used on: S04, S06-S08, S10.

## Persistent player and Now Playing

- Variants: compact persistent bar, expanded details panel.
- States: no item, loading/buffering, playing, paused, ended, error, unavailable.
- Tokens: surface, border, text/muted, accent progress, radius-lg for expanded panel.
- A11y: landmark labelled “Audio player”; play state exposed through button label; announce track changes politely without repeatedly announcing progress; controls support keyboard.
- Used on: S02-S08.

## Playback controls

- Variants: play/pause, previous/next, shuffle, repeat, volume, seek.
- States: default, hover, active, focus-visible, disabled, loading; shuffle/repeat selected states.
- Tokens: text/muted, accent for selected/progress, focus ring, pill track.
- A11y: buttons use action names (“Pause”, “Enable shuffle”); sliders expose `role="slider"`, min/max/current and keyboard arrows; never require dragging alone.
- Used on: S06-S08.

## Queue list

- Variants: current item and upcoming items.
- States: empty, populated, reordering, loading, stale conflict, error.
- Tokens: surface, surface-raised hover, border, text/muted.
- A11y: ordered list; reorder buttons are an accessible alternative to drag; announce position updates; confirm before clearing the whole queue.
- Used on: S07-S08.

## Playlist editor and playlist actions

- Variants: create form, rename form, add-to-playlist chooser, context menu.
- States: blank, editing, validation error, saving, success, error, no playlists, menu open.
- Tokens: surface/surface-raised, border-input, text/muted, danger, radius-md, pop shadow for menu.
- A11y: dialogs have title, initial focus and focus trap; Escape closes unless submitting; errors connect via `aria-describedby`; restore focus to trigger.
- Used on: S05-S06, S09-S10.

## Toast and inline notice

- Variants: success, warning, error, info.
- States: visible, dismissed, timeout; persistent for errors requiring action.
- Tokens: success/warning/danger paired with surface and text; border and radius-md.
- A11y: use `role="status"` for passive success and `role="alert"` only for urgent errors; provide a dismiss button when persistent.
- Used on: S01, S05-S11.

## Authentication form

- Variants: sign-in, sign-up.
- States: pristine, editing, invalid, submitting, server error, success.
- Tokens: bg, surface, text/muted, border-input, focus, danger.
- A11y: explicit labels, correct autocomplete and input types, inline errors, no password-only error color cue, retain values on recoverable errors.
- Used on: S01, gated actions on S05-S10.

## Responsive shell

- Desktop: 248px navigation rail, flexible content capped at 1440px, player reserved at the bottom (88px).
- Tablet: navigation rail may compact to icon-plus-tooltip; content cards reflow from 4 to 2 columns.
- Small screens: navigation becomes a bottom bar, player controls remain reachable, card grid becomes 2 columns, expanded Now Playing takes the full viewport.
- Breakpoints: 640px, 768px, 1024px, 1280px. These are starting values, not measurements from Spotify screenshots.
- Reduced motion: honor `prefers-reduced-motion`; no state depends on animation.

## Prototype primitive inventory

`replica/design/primitives.html` is a standalone style guide implementing buttons, fields, cards, track rows, player controls, queue states, and notices against the tokens. It is a static interaction/state preview, not a functioning audio player.
