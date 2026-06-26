# MB Show Site Architecture

Last Updated: 2026-06-19

## System Overview

The project is a mostly static Vercel site with Node-based data preparation and Playwright verification.

Data flow:

1. Sponsor data is scraped into `data/sponsors.raw.json`.
2. Enrichment scripts generate `data/sponsors.enriched.json`.
3. Seed generation writes Supabase SQL when needed.
4. Public directory scripts load/configure sponsor presentation on static pages.
5. Analytics scripts track public behavior.

## Major Components

- `index.html`: public homepage.
- `admin.html`: admin surface.
- `scripts/directory-app.js`: sponsor directory behavior.
- `scripts/admin-app.js`: admin behavior.
- `scripts/scrape-sponsors.mjs`, `scripts/enrich-sponsors.mjs`, `scripts/generate-sponsor-seed-sql.mjs`: data pipeline.
- `scripts/media-player.js`, `scripts/site-nav.js`, `scripts/analytics.js`: public interaction support.
- `tests/directory.spec.mjs`: Playwright checks.

## Data

Sponsor data lives in JSON files under `data/`. Supabase seed SQL lives under `supabase/`.

## External Services

- Vercel for hosting.
- Supabase for seedable sponsor data if used.
- GA4 for analytics.
- Source pages from Michael Berry Show/iHeart/Shopify contexts.

## Deployment

Use the local Vercel project linkage and `npm run deploy`/Vercel CLI flow. Verify public pages and sponsor directory after deployment.
