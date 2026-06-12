**Source Visual Truth**
- Path: `/Users/brianhakel2/.codex/attachments/4de2b806-1961-4533-a8fe-b298ae85aff3/codex-clipboard-68d030b0-f21f-4b92-a97c-5fbc41e6e0c7.png`
- Notes: Use the screenshot as the before-state plus Brian's requested corrections: remove generated gradients and draft labels, replace the giant title text with the official MB Show logo, expand the red show-times block so the right-side link grid fills the panel, rewrite sponsor search copy for radio listeners, avoid pagination in search results, and demonstrate premium listings with Abacus only when relevant.

**Implementation Evidence**
- Desktop full-page screenshot: `/tmp/mb-show-flat-hero-desktop.png`
- Desktop viewport screenshot: `/tmp/mb-show-flat-hero-desktop-viewport.png`
- HVAC premium search screenshot: `/tmp/mb-show-premium-hvac-search.png`
- Patio search screenshot: `/tmp/mb-show-patio-unpaginated.png`
- Mobile screenshot: `/tmp/mb-show-flat-hero-mobile.png`
- Full-view comparison evidence: `/tmp/mb-show-flat-design-compare.png`
- Viewport: desktop 1440x970 and mobile 390x1200
- State: homepage default, HVAC search, patio search

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: the hero no longer uses oversized generated title text; the official logo is the primary brand mark, and the search heading uses listener-facing radio-show language.
- Spacing and layout rhythm: the red schedule panel is taller, the quick-link grid fills the right card more evenly, and mobile controls remain stacked without overlap.
- Colors and visual tokens: all gradient backgrounds were removed; the page uses flat navy, red, blue, green, and gold brand surfaces.
- Image quality and asset fidelity: the existing official MB logo image is reused at hero scale; no placeholder or generated image assets were introduced.
- Copy and content: "Official show hub draft", "Sponsor directory", and the previous long-post language were removed from visible UI.

**Patches Made**
- Replaced hero title text with the official MB Show logo.
- Flattened hero, sponsor, and schedule backgrounds.
- Expanded the live-times panel and filled the right-side card.
- Rewrote the sponsor search heading.
- Disabled pagination while searching and render all matching search results.
- Added Abacus as a premium demo listing that ranks first on default/relevant searches and does not appear on irrelevant patio search.
- Updated Supabase seed generation and search-term expansion to match the premium/search behavior.

**Open Questions**
- None blocking. Supabase project creation/import is still pending org/cost confirmation.

**Implementation Checklist**
- Validate HTML and JS syntax.
- Verify directory interactions with Playwright.
- Inspect desktop, search, and mobile screenshots.
- Deploy the updated preview to Vercel.

**Follow-up Polish**
- Once Supabase is created, normalize sponsor categories/service keywords more carefully so paid placement controls have clean admin-facing guardrails.

final result: passed
