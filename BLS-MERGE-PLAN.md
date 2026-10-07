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

## Scope change (Oct 7, later)
Bix: "Ultimately I want as many jobs as there are to be options."
- Goal is now **every BLS occupation** (~800 detailed occupations with national
  wage data), not just the top 100 by pay. The top-100-by-pay list is still a
  good first batch, since those are the highest-value adds.
- Hand-writing 800 fingerprints isn't realistic or trustworthy. Instead,
  **compute fingerprints from public data**:
  - Pay, education, employment, growth: BLS OEWS national data + Employment Projections.
  - RIASEC code: O*NET interest scores.
  - The 17 trait demand levels: O*NET Work Context / Work Activities (e.g. travel,
    selling, hours, outdoor/on-site, programming, public speaking, etc.).
  - Write a script (`tools/build-careers.js`) that turns those files into
    `careers.js`, so it can be re-run when BLS updates.
- Bix's 46 hand-tuned careers stay as-is and win over computed ones when they
  cover the same job (keep the BLS link/pay block on them).
- With hundreds of careers, keep top-10 results, add a **search box** so users
  can look up any job's fit, and consider loading `careers.js` only when results
  are first needed.
- **Data access problem:** this workspace can't download from bls.gov or
  onetcenter.org (network blocked). Options, in order: (1) find an official copy
  on GitHub/npm, which are reachable; (2) ask Bix to download two free files and
  add them to the repo — O*NET "Database (text files)" zip from
  onetcenter.org/database.html, and the OEWS "National" xlsx from
  bls.gov/oes/tables.htm. Give him one click-by-click step at a time.

## Decisions
- **Careers move into their own file, `careers.js`**, loaded by `index.html` with
  `<script src="careers.js">`. A `.js` file works both when opening `index.html`
  directly on a laptop and on Cloudflare. (A `.json` file would break when opened
  locally, because browsers block reading files that way.)
- Existing 46 careers stay. Where a BLS occupation is the same job as an existing
  career, it is merged into that career instead of being added twice. The
  hand-tuned fingerprint and pay are kept for scoring (sales pay includes
  commission, which BLS wages leave out); the official BLS numbers are shown
  alongside on the card. Umbrella careers (Skilled Trades, Engineer, Scientist,
  Allied Health, etc.) have no SOC codes yet, so specific jobs like Electrician
  still appear separately. Bix to decide whether to fold those in.
- Each career gets a `bls` field: official occupation title, SOC code, median pay,
  employment, projected growth, and a link to its Occupational Outlook Handbook page.
- Pay format stays `[entry, ~year 4, senior]` in $k. Entry ≈ BLS 10th–25th
  percentile, senior ≈ 75th–90th percentile.

## Steps
- [ ] 1. Research: BLS top 100 by median pay, with pay percentiles, education,
       growth, and OOH links. (The deep research run did NOT start on Oct 7 —
       not enough usage left. Gather it directly from bls.gov: OEWS May 2024
       national data and the OOH pages. Save the result as `data/bls-top100.csv`
       on this branch and commit before writing any fingerprints.)
- [x] 2. Move the existing `C` list out of `index.html` into `careers.js`
       (now `CAREERS_HAND`, each with `soc` codes; `mergeCareers()` in index.html
       folds generated `CAREERS_BLS` entries from `careers-bls.js` into them)
- [x] 3. Map BLS occupations to existing careers (merge overlaps) — `soc` on each hand-tuned career
- [x] 4. Fingerprints are computed by `tools/build-careers.mjs` (O*NET 31.0), not hand-written
- [ ] 4b. BLOCKED on Bix: add the two BLS files (OEWS national zip + occupation.xlsx)
       to `source-data/bls/`, then the GitHub Action builds `careers-bls.js`
- [x] 5. Show the new BLS info on results cards; search box for any career
       (tested with placeholder wages: 802 careers, no errors, no sideways scroll on phones)
- [x] 6. Test in a browser (including phone size); check all careers score
- [x] 7. Update README (career count, `careers.js`, data sources and limits)
- [x] 8. Open the pull request — draft PR #2 (https://github.com/bjohnso88/career-combine/pull/2)
- [ ] 9. After the BLS files land and the Action builds careers-bls.js: spot-check
       results, rerun the browser test, delete this file, mark the PR ready
