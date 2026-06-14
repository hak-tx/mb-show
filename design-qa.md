**Source Visual Truth**
- Path: current user request in thread, building on `/Users/brianhakel2/.codex/attachments/2b980657-5e21-4682-94d1-0dd02baea876/codex-clipboard-ce5a89d5-7fc1-4d5a-9743-650b03d28e85.png`
- Notes: Brian asked to return the main hero section and directory to dark blue, hide sponsor results until search/filter intent starts, replace pagination with a More reveal button, and change the directory title to `Search all Michael Berry Show Sponsors you hear on air.`
- Latest note: Brian asked to hide Admin from the public menu, rename Email to Contact, rename Email List to Join List, remove the sticky header, and collapse the mobile nav while keeping Cart accessible at the top right.
- Latest visual note: Brian supplied mobile screenshots at `/Users/brianhakel2/.codex/attachments/a287d2ed-0921-4a0c-b5ed-9776f6924c99/codex-clipboard-2cdb4651-dc43-4478-9274-2a19256d05fd.png` and `/Users/brianhakel2/.codex/attachments/b387440c-2002-4ed1-830d-fe6ee99dce8c/codex-clipboard-6f62efbd-102c-416e-b3c4-c00bd287562f.png`, asking for the four main buttons to become a 2x2 mobile grid and for the sponsor directory controls to use fewer competing colors for an older, less tech-savvy audience.
- Current visual note: Brian supplied `/Users/brianhakel2/.codex/attachments/97ed7307-801a-4220-9175-b8c157e7acfa/codex-clipboard-da84f904-fc18-4cf2-b526-956cf2e00aa1.png` and asked to move the Full KTRH list button to the bottom of the sponsor section, make search the dominant focus, remove city from the placeholder, remove filters, and add a text hint for the Cards/List view buttons.

**Implementation Evidence**
- Default desktop screenshot: `/tmp/mb-show-dark-hidden-default.png`
- Texas filter screenshot: `/tmp/mb-show-dark-state-more.png`
- Texas filter full-page screenshot: `/tmp/mb-show-dark-state-more-full.png`
- After More full-page screenshot: `/tmp/mb-show-dark-after-more-full.png`
- HVAC search screenshot: `/tmp/mb-show-dark-hvac-search.png`
- Mobile default screenshot: `/tmp/mb-show-dark-mobile-default.png`
- Desktop nav screenshot: `/tmp/mb-show-desktop-nav.png`
- Mobile collapsed nav screenshot: `/tmp/mb-show-mobile-nav-collapsed.png`
- Mobile open nav screenshot: `/tmp/mb-show-mobile-nav-open.png`
- Mobile simplified default screenshot: `/tmp/mb-show-mobile-2x2-simple-default.png`
- Mobile simplified filtered screenshot: `/tmp/mb-show-mobile-2x2-simple-filter.png`
- Desktop simplified directory screenshot: `/tmp/mb-show-desktop-2x2-simple.png`
- Mobile search-focus default screenshot: `/tmp/mb-show-mobile-search-focus-default.png`
- Mobile search-focus results screenshot: `/tmp/mb-show-mobile-search-focus-results.png`
- Desktop search-focus default screenshot: `/tmp/mb-show-desktop-search-focus-default.png`
- Mobile source/implementation comparison: `/tmp/mb-show-mobile-search-focus-comparison.png`
- Full-view comparison evidence: current mobile source screenshot plus desktop/mobile implementation screenshots above.
- Viewport: desktop 1920x1400, desktop 1440x1800, mobile 390x1200, and mobile 390x1300
- State: homepage default, prior Texas filter, after More, HVAC Houston search, desktop nav, mobile collapsed nav, mobile open nav, search-only default, and search-only results

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: the directory title uses the requested copy and retains the established bold show-site hierarchy.
- Spacing and layout rhythm: the default directory now stays compact with no result cards; search shows matching results first and More expands long result sets in-place. Mobile header stays compact at 84px collapsed and expands only after Menu is pressed.
- Colors and visual tokens: the main hero card and sponsor directory remain dark navy (`rgb(7, 20, 59)`), while the directory form sits in a light panel with red reserved for the primary Search action, navy for selected view controls, and neutral white/gray for secondary surfaces.
- Image quality and asset fidelity: the official MB Show logo remains the primary asset and stays readable against the restored dark hero panel via a white logo surface.
- Copy and content: default result copy prompts search intent only, no filter or pagination/page-number language remains, Admin is absent from the public nav, and public nav labels read Contact and Join List.

**Patches Made**
- Changed the hero card and sponsor directory back to dark navy.
- Updated the sponsor directory title to `Search all Michael Berry Show Sponsors you hear on air.`
- Hid sponsor result cards until a search or filter is active.
- Replaced page-number pagination with a More button that reveals the next batch below.
- Updated the Playwright directory test for hidden default state, More reveal behavior, and clear-to-hidden behavior.
- Removed the public Admin nav link.
- Renamed public nav labels to Contact and Join List, and matched the quick-link tile to Join List.
- Changed the header from sticky to normal flow.
- Added a mobile Menu toggle with Cart kept visible in the top-right header area.
- Added Playwright coverage for the collapsed mobile header.
- Changed mobile quick links from four stacked tiles to a 2x2 grid.
- Simplified the sponsor directory color system by removing yellow from the KTRH link and filter/view controls, moving filters into a light panel, and changing sponsor result cards to white cards inside the dark section.
- Moved the Full KTRH list link to the bottom of the sponsor section.
- Removed state, category, page-size, and clear filter controls from the public sponsor directory.
- Made the search row more prominent with a larger input, larger Search button, stronger border, and subtle elevation.
- Changed the search placeholder to `Search service or sponsor`.
- Added `View results as` copy above the Cards/List buttons on mobile and beside them on desktop.

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
