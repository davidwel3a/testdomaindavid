# Bug report: Riff listening demo

Build: local workspace (no Git repository) · Date: 2026-10-26

## Reproduced bugs

None. The UI flows and Supabase-backed paths were not executed, so no user-visible bug has been reproduced in this pass.

## To check

- Local HTTP smoke requests could not run in the default workspace sandbox because localhost socket access was denied. An elevated local-only request was submitted for review; no result is recorded yet.
- Browser click-through and screenshot capture are blocked by the earlier browser security decision for the local `file://` page; that decision prohibits using Playwright or another browser surface to reach the same UI result.
- Supabase auth, row-level security, account deletion, and two-user isolation require the user's own project and credentials. No `.env` is present.
- No E2E suite was added or run. `@playwright/test` and axe packages are not installed in this project.

## Known implementation gaps (not bugs reproduced during this pass)

- Queue reordering and individual playlist-item removal are not exposed in the current UI.
- Playback is a generated tone with sample metadata, not a real audio stream.
- Supabase backend features remain unconfigured and therefore unverified.
- Responsive rules and accessibility labels need the manual checks in `test-plan.md`.
