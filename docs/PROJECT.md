# MB Show Site Project Overview

Last Updated: 2026-06-19

MB Show Site is the Michael Berry Show homepage and sponsor directory project. It is a simple public Vercel site with sponsor data ingestion/enrichment, sponsor directory UI, media/player behavior, admin tooling, analytics, and domain-planning context.

Target users:

- Michael Berry Show listeners.
- Sponsors and businesses listed in the directory.
- Operators maintaining sponsor records and public site content.

Core features:

- Static public homepage and sponsor directory.
- Sponsor scrape/enrich/build scripts.
- Inline/admin sponsor management surface.
- Media player and site navigation scripts.
- GA4 tracking and Playwright design/behavior checks.

Business goals:

- Present a clean public homepage.
- Make sponsors easy to find without embarrassing false positives.
- Preserve a separate path for Shopify/store functionality when domain planning requires it.

Revenue model: sponsor/directory support and show commerce context. Shopify store work is related but should stay on the appropriate hostname/project lane.

Tech stack:

- Static HTML/CSS/JavaScript.
- Node scripts for sponsor scraping/enrichment/seed generation.
- Playwright tests.
- Supabase seed SQL.
- Vercel deployment.

Repository structure:

- `index.html`, `admin.html`, `styles.css`, `config.js`: public/admin site surfaces.
- `scripts/`: sponsor, analytics, media, nav, and directory app scripts.
- `data/`: raw and enriched sponsor data.
- `supabase/`: seed SQL.
- `tests/`: Playwright checks.
- `screenshots/`: design QA artifacts.

Deployment environments:

- Vercel project linked locally.
- Public alias context includes MB Show homepage/domain planning.
