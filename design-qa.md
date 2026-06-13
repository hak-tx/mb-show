**Source Visual Truth**
- Path: `/Users/brianhakel2/.codex/attachments/03e926eb-3c9c-42c3-92be-278ebdb3431e/codex-clipboard-baedf2a7-9184-41dd-91a6-488dd558c26d.png`
- Notes: Brian's direction was to make the site cleaner and simpler, closer to what Michael would likely prefer, and to improve the red live-show-times layout.

**Implementation Evidence**
- Desktop viewport screenshot: `/tmp/mb-show-clean-desktop-viewport.png`
- Desktop full-page screenshot: `/tmp/mb-show-clean-desktop-full.png`
- HVAC search screenshot: `/tmp/mb-show-clean-hvac-v2.png`
- Patio search screenshot: `/tmp/mb-show-clean-patio.png`
- Mobile screenshot: `/tmp/mb-show-clean-mobile-full.png`
- Full-view comparison evidence: `/tmp/mb-show-clean-design-compare.png`
- Viewport: desktop 1440x970 and mobile 390x1200
- State: homepage default, HVAC search, patio search

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: hero and directory headings are calmer, with less shouting and more conventional hierarchy.
- Spacing and layout rhythm: the first screen uses lighter white cards, shorter panels, fewer visible controls, and list-view directory results by default.
- Colors and visual tokens: brand colors remain, but the public surface now uses more white space and restrained navy/red/green/gold accents.
- Image quality and asset fidelity: the official MB Show logo remains the main visual asset and renders cleanly at desktop and mobile sizes.
- Copy and content: no draft/prototype copy is visible; the directory remains listener-facing.

**Patches Made**
- Changed hero and sponsor directory from heavy dark panels to white/light utility sections.
- Reworked the red schedule block into separate `8a-11a` and `5p-7p` time rows.
- Reduced quick-link height and typography weight.
- Hid secondary filters by default, keeping State, Category, Cards/List, and Clear visible.
- Made list view the default sponsor directory view.
- Improved search intent parsing so city/state words filter location instead of making every local sponsor look service-relevant.

**Open Questions**
- None blocking. Supabase creation/import is still pending org/cost confirmation.

**Implementation Checklist**
- Validate HTML and JS syntax.
- Verify directory interactions with Playwright.
- Inspect desktop, search, and mobile screenshots.
- Deploy updated preview to Vercel.

**Follow-up Polish**
- Once Supabase is active, move the city/state intent parsing into the database RPC so local fallback and Supabase results rank identically.

final result: passed
