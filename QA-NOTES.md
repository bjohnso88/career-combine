# QA deep dive — working notes (delete before merging)

Bix (Oct 13): test many answer combinations, find anything broken, confusing, or improvable; one PR.
Branch `claude/qa-deep-dive`. Commit + push after each step so work can resume.

## Steps
- [x] 1. Realistic personas (answer like real people, not like a career) — do results make sense?
- [x] 2. Edge cases: nothing answered, partial, all-max/all-min, extreme pay, education limits, field switching
- [x] 3. Saved answers from older versions (removed questions, old fields), backup/restore, start over
- [x] 4. Layout: every page at 320/390/desktop, light + dark
- [x] 5. Results details: cards, search, live bar, summary text, PDF, links
- [x] 6. Performance (load + live bar speed)
- [ ] 7. Fix findings, retest, finish PR, delete this file

## Findings
- P1 Salesperson who picks "Money": finance jobs crowd out sales jobs, because careers with no subject tags (sales, PM, ops, HR, EA) score 0 on subject match. Fix: careers not about any particular subject count as neutral.
- P2 "Why it fits" says "You want pressure and deadlines / long hours" for middle-of-the-road answers (threshold .6 is the scale midpoint after blending). Fix: higher threshold + natural wording per trait ("You're OK with long hours").
- OK: 15/15 personas get sensible top 10s (tools/personas.py).
- OK: empty / partial / all-max / all-min / extreme pay / no-degree / blank "Something else" / field switching all render without errors, NaN, or "undefined". Search escapes HTML.
- OK: old saved answers (removed questions, shifted page numbers) load fine; backup, bad backup, restore, reset work.
- S1 A saved subject key that no longer exists would print "undefined" in the AI summary. Fix: ignore unknown keys.
- S2 Search ignores 1-letter words, so "c++" or "c" finds nothing. Minor; leave.
- L1 Sliders are 16px tall: fiddly to drag on a phone. Fixed: 32px touch area.
- L2 Start page counts were stale (30 true/false+this-or-that, 12 scenarios), missed the new subjects step, and said field questions unlock "by your resume". Fixed: counts computed from the question lists; wording corrected.
- L3 Fit percentages on the top-3 cards, the progress bar, and the live-matches bar were red, which testers read as "error". Fixed: navy (red stays for the brand name).
- OK: no page scrolls sideways at 320px, 390px (dark), or desktop.
- R4 The "Fit blends..." explanation doesn't mention the subjects step. Fix: add it.
- R7 Stepping stones list unrelated jobs (CNA/EMT for a tech person) because they're ranked by readiness alone. Fix: rank by how high the target careers are in your results.
- R8 MBTI shows "ENFJ" when every Big Five answer is exactly neutral. Fix: show "?" when a trait is close to the middle.
- R6 Hand-tuned careers' education levels sometimes differ from BLS typical entry. Leave (hand-tuned = realistic hiring).
- OK: performance — page load 0.5s with 4x slower CPU, results render 0.33s, scoring all 800 careers 0.09s. careers-bls.js is 182KB gzipped.
