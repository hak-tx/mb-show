**Source Visual Truth**
- Path: `/Users/brianhakel2/.codex/attachments/2b980657-5e21-4682-94d1-0dd02baea876/codex-clipboard-ce5a89d5-7fc1-4d5a-9743-650b03d28e85.png`
- Notes: Brian asked for a cleaner, simpler Michael Berry Show page, removal of the lower hero buttons, a light slate-blue search directory background, no premium listing treatment for now, equal Cards/List/Clear button sizing, and a better red live-times layout.

**Implementation Evidence**
- Desktop viewport screenshot: `/tmp/mb-show-slate-directory-desktop-viewport.png`
- Desktop full-page screenshot: `/tmp/mb-show-slate-directory-desktop-full.png`
- HVAC search screenshot: `/tmp/mb-show-slate-directory-hvac.png`
- Mobile full-page screenshot: `/tmp/mb-show-slate-directory-mobile-full.png`
- Full-view comparison evidence: `/tmp/mb-show-slate-directory-design-compare.png`
- Viewport: desktop 1920x1400 and mobile 390x1200
- State: homepage default and HVAC Houston search

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: the same bold broadcast-style hierarchy is retained, with less clutter around the hero and directory controls.
- Spacing and layout rhythm: the lower hero action row is removed, the live-time block is balanced into two clear time columns on desktop, and the directory controls align cleanly.
- Colors and visual tokens: the sponsor directory now uses light slate blue (`rgb(231, 237, 247)`) while brand red, navy, gold, and green stay intact.
- Image quality and asset fidelity: the official MB Show logo remains the primary asset and renders cleanly in desktop and mobile captures.
- Copy and content: public premium-listing language is removed; search copy and sponsor directory content remain listener-facing.

**Patches Made**
- Removed the lower hero `Listen Live` and `Browse Sponsors` buttons.
- Changed the red schedule block from stacked `AND` copy to a cleaner two-time layout.
- Changed the sponsor directory background to light slate blue.
- Removed public premium badges, highlighted premium card styling, and premium-first sorting from the directory UI.
- Made Cards, List, and Clear controls the same measured size: `86x44`.
- Updated the directory test to assert no public premium label appears.

**Open Questions**
- None blocking. Supabase creation/import is still pending org/cost confirmation.

**Implementation Checklist**
- Validate HTML and JS syntax.
- Verify directory interactions with Playwright.
- Inspect desktop, HVAC search, mobile, and side-by-side comparison screenshots.
- Deploy updated preview to Vercel.

**Follow-up Polish**
- Once Supabase is active, mirror the current public ranking behavior in the database RPC so local fallback and Supabase search stay consistent.

final result: passed
