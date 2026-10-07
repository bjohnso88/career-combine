# BLS career merge — working plan (delete before merging)

This file saves progress so work can resume after a break. It lives only on the
`bls-top-100-careers` branch.

## What Bix asked for (Oct 7, 2026)
- Merge the existing 46 careers with the **top 100 highest-paying occupations
  according to the Bureau of Labor Statistics** (median annual wage).
- Every career gets its own fingerprint (RIASEC code, pay, 17 trait demand
  levels, education, skills) plus info that helps the user.
- Open it as a **pull request**, not straight to `main`. Bix approves before merging.
- Resume automatically at 1:20 pm Central if the session runs out.

## Decisions
- **Careers move into their own file, `careers.js`**, loaded by `index.html` with
  `<script src="careers.js">`. A `.js` file works both when opening `index.html`
  directly on a laptop and on Cloudflare. (A `.json` file would break when opened
  locally, because browsers block reading files that way.)
- Existing 46 careers stay. Where a BLS occupation is the same job as an existing
  career, it is merged into that career (BLS pay and education win) instead of
  being added twice.
- Each career gets a `bls` field: official occupation title, SOC code, median pay,
  employment, projected growth, and a link to its Occupational Outlook Handbook page.
- Pay format stays `[entry, ~year 4, senior]` in $k. Entry ≈ BLS 10th–25th
  percentile, senior ≈ 75th–90th percentile.

## Steps
- [ ] 1. Research: BLS top 100 by median pay, with pay percentiles, education,
       growth, and OOH links
- [ ] 2. Move the existing `C` list out of `index.html` into `careers.js`
- [ ] 3. Map BLS occupations to existing careers (merge overlaps)
- [ ] 4. Write fingerprints for the new careers (batches of ~20, commit each batch)
- [ ] 5. Show the new BLS info on results cards; update STEPS links if needed
- [ ] 6. Test in a browser (including phone size); check all careers score
- [ ] 7. Update README (career count, `careers.js`, data sources and limits)
- [ ] 8. Open the pull request; delete this file
