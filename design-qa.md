**Source Visual Truth**
- Path: `/Users/brianhakel2/.codex/attachments/995372f4-c9c7-40e5-907c-009b9545cad2/codex-clipboard-035bb8f9-5c07-4500-b09b-4ba4c8ee810b.png`
- Notes: Use the screenshot as the before-state plus Brian's requested corrections: remove "cleaner front door" copy, avoid the white KTRH action tile, use KTRH blue/green accents, enlarge PODCAST/LISTEN LIVE/EMAIL LIST/MERCH STORE action text, and make the directory paginated with list/card views and filters.

**Implementation Evidence**
- Desktop viewport screenshot: `/tmp/mb-show-directory-desktop-viewport.png`
- Desktop full-page screenshot: `/tmp/mb-show-directory-desktop.png`
- Texas list-view screenshot: `/tmp/mb-show-directory-list-texas.png`
- Mobile screenshot: `/tmp/mb-show-directory-mobile.png`
- Full-view comparison evidence: `/tmp/mb-show-design-compare.png`
- Viewport: desktop 1440x970 and mobile 390x1200
- State: homepage default, sponsor directory card view, Texas-filtered list view

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: action tile labels are now materially larger and uppercase; hero and section hierarchy still fits the existing MB draft style without text overflow on desktop or mobile.
- Spacing and layout rhythm: sponsor controls, cards, list view, and pagination hold an 8px-radius system and remain readable at desktop and mobile widths.
- Colors and visual tokens: KTRH/source radio colors are now represented with blue, green, red, and gold; the former white KTRH tile is gone.
- Image quality and asset fidelity: existing logo and merch images still render from source assets; no placeholder image replacements were introduced.
- Copy and content: "cleaner front door" was removed; sponsor directory copy still explains the finder without sounding like internal product language.

**Patches Made**
- Reworked hero quick links to LISTEN LIVE, PODCAST, EMAIL LIST, and MERCH STORE.
- Added state, area, category, page-size, card/list, clear, and pagination controls.
- Added client-side query expansion, derived state filters, card/list rendering, and result summaries.
- Added Playwright coverage for pagination, Texas filter, and list-view toggle.

**Open Questions**
- None blocking. Supabase creation/import is still pending Brian's org/cost confirmation from the prior step.

**Implementation Checklist**
- Validate HTML and JS syntax.
- Verify directory interactions with Playwright.
- Inspect desktop, list-view, and mobile screenshots.

**Follow-up Polish**
- Once Supabase is created, make state/city normalization part of the import pipeline instead of only deriving it in the browser.

final result: passed
