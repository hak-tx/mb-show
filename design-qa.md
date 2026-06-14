**Source Visual Truth**
- Path: current user request in thread, building on `/Users/brianhakel2/.codex/attachments/2b980657-5e21-4682-94d1-0dd02baea876/codex-clipboard-ce5a89d5-7fc1-4d5a-9743-650b03d28e85.png`
- Notes: Brian asked to return the main hero section and directory to dark blue, hide sponsor results until search/filter intent starts, replace pagination with a More reveal button, and change the directory title to `Search all Michael Berry Show Sponsors you hear on air.`

**Implementation Evidence**
- Default desktop screenshot: `/tmp/mb-show-dark-hidden-default.png`
- Texas filter screenshot: `/tmp/mb-show-dark-state-more.png`
- Texas filter full-page screenshot: `/tmp/mb-show-dark-state-more-full.png`
- After More full-page screenshot: `/tmp/mb-show-dark-after-more-full.png`
- HVAC search screenshot: `/tmp/mb-show-dark-hvac-search.png`
- Mobile default screenshot: `/tmp/mb-show-dark-mobile-default.png`
- Full-view comparison evidence: textual request plus desktop/mobile/state screenshots above; no new standalone mock image was supplied for this iteration.
- Viewport: desktop 1920x1400, desktop 1440x1800, and mobile 390x1200
- State: homepage default, Texas filter, after More, and HVAC Houston search

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: the directory title uses the requested copy and retains the established bold show-site hierarchy.
- Spacing and layout rhythm: the default directory now stays compact with no result cards; filtering shows 12 results first and More expands the list in-place.
- Colors and visual tokens: the main hero card and sponsor directory are back on dark navy (`rgb(7, 20, 59)`) with gold/red/white controls.
- Image quality and asset fidelity: the official MB Show logo remains the primary asset and stays readable against the restored dark hero panel via a white logo surface.
- Copy and content: default result copy prompts search/filter intent, and no pagination/page-number language remains.

**Patches Made**
- Changed the hero card and sponsor directory back to dark navy.
- Updated the sponsor directory title to `Search all Michael Berry Show Sponsors you hear on air.`
- Hid sponsor result cards until a search or filter is active.
- Replaced page-number pagination with a More button that reveals the next batch below.
- Updated the Playwright directory test for hidden default state, More reveal behavior, and clear-to-hidden behavior.

**Open Questions**
- None blocking. Supabase creation/import is still pending org/cost confirmation.

**Implementation Checklist**
- Validate HTML and JS syntax.
- Verify directory interactions with Playwright.
- Inspect desktop, filtered, search, and mobile screenshots.
- Deploy updated preview to Vercel.

**Follow-up Polish**
- Once Supabase is active, mirror the same hidden-default and More-result behavior against the live RPC response.

final result: passed
