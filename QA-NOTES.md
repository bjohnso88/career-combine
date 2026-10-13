# QA deep dive — working notes (delete before merging)

Bix (Oct 13): test many answer combinations, find anything broken, confusing, or improvable; one PR.
Branch `claude/qa-deep-dive`. Commit + push after each step so work can resume.

## Steps
- [x] 1. Realistic personas (answer like real people, not like a career) — do results make sense?
- [ ] 2. Edge cases: nothing answered, partial, all-max/all-min, extreme pay, education limits, field switching
- [ ] 3. Saved answers from older versions (removed questions, old fields), backup/restore, start over
- [ ] 4. Layout: every page at 320/390/desktop, light + dark
- [ ] 5. Results details: cards, search, live bar, summary text, PDF, links
- [ ] 6. Performance (load + live bar speed)
- [ ] 7. Fix findings, retest, finish PR, delete this file

## Findings
- P1 Salesperson who picks "Money": finance jobs crowd out sales jobs, because careers with no subject tags (sales, PM, ops, HR, EA) score 0 on subject match. Fix: careers not about any particular subject count as neutral.
- P2 "Why it fits" says "You want pressure and deadlines / long hours" for middle-of-the-road answers (threshold .6 is the scale midpoint after blending). Fix: higher threshold + natural wording per trait ("You're OK with long hours").
- OK: 15/15 personas get sensible top 10s (tools/personas.py).
