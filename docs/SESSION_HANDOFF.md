# MB Show Site Session Handoff

Last Updated: 2026-06-19

Current Objective: document project continuity without changing site behavior or sponsor data.

Current Branch: `main`.

Current Status: clean working tree before docs. Recent work updated a sponsor phone number and added/adjusted analytics and compact public directory behavior.

Most Recent Accomplishments:

- Added the standard project documentation set under `docs/`.
- Captured current branch, sponsor-directory rules, and deployment/domain context.

Immediate Next Actions:

- If sponsor data changes, run the sponsor pipeline and verify output before deploy.
- Use Playwright checks after public directory behavior changes.
- Keep Shopify/store hostname work separate from homepage deployment.

Known Blockers:

- DNS/store split requires correct owner/registrar access and should not be guessed.

Files Currently Being Modified:

- Documentation files under `docs/` were added by this setup pass.

Important Context:

- Sponsor search precision matters more than broad matching.
- Future sessions should read the standard docs before making sponsor or public-site changes.
