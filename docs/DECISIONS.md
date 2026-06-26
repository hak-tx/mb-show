# MB Show Site Decisions

Last Updated: 2026-06-19

## Simple Public Site Direction

Decision: Keep the public homepage and sponsor directory simple, compact, and easy to scan.

Reasoning: Prior UI iteration favored calmer presentation over busy/filter-heavy layouts.

Alternatives considered: More decorative layouts and broader filter surfaces.

Tradeoffs: The page may feel less flashy, but it is easier for listeners to use.

## Conservative Sponsor Matching

Decision: Prefer conservative sponsor search/category matching.

Reasoning: False positives in sponsor directories are embarrassing and reduce trust.

Alternatives considered: Broad fuzzy matching.

Tradeoffs: Some valid matches may require explicit taxonomy updates.

## Keep Shopify On A Separate Hostname

Decision: Do not try to split only the homepage from Shopify on the same hostname; use Vercel for apex/www and Shopify on a store subdomain if needed.

Reasoning: DNS/hosting constraints make mixed root-host handling fragile.

Alternatives considered: Sharing the same hostname for homepage and Shopify store paths.

Tradeoffs: Separate hostnames require clearer navigation but avoid deployment conflict.
