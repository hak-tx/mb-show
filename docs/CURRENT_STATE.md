# MB Show Site Current State

Last Updated: 2026-06-19

Current focus: simple public homepage, conservative sponsor directory behavior, analytics, and domain/store separation.

Current branch: `main`.

Git state at audit:

- Working tree was clean before documentation files were added.
- Latest commit at audit: `660f37a Update Hawthorne Capital phone`.

Recent commits:

- `660f37a` Update Hawthorne Capital phone.
- `23668ab` Add Google Analytics tracking.
- `35d55ca` Rename media close control.
- `5f11b8b` Stack CST text under schedule times.
- `839398c` Show compact sponsor directory by default.

Features completed:

- Public homepage draft.
- Compact sponsor directory.
- Sponsor scraping/enrichment and seed generation scripts.
- Media close/control behavior.
- GA tracking.
- Playwright tests and design screenshots.

Features in progress:

- Sponsor data maintenance.
- Public UI simplification and sponsor search precision.
- Domain planning for Vercel homepage versus Shopify store paths.

Known bugs/blockers:

- Sponsor search should stay conservative; fewer results are better than wrong matches.
- DNS cannot split only the homepage from Shopify while keeping the store on the same hostname. Keep the store on a separate hostname such as `shop.` if needed.

Outstanding questions:

- Whether current sponsor data needs a fresh scrape/enrichment run.
- Whether GoDaddy/DNS ownership tasks are still pending for final domain split.
