# QA deep dive — working notes (delete before merging)

Bix (Oct 13): test many answer combinations, find anything broken, confusing, or improvable; one PR.
Branch `claude/qa-deep-dive`. Commit + push after each step so work can resume.

## Steps
- [ ] 1. Realistic personas (answer like real people, not like a career) — do results make sense?
- [ ] 2. Edge cases: nothing answered, partial, all-max/all-min, extreme pay, education limits, field switching
- [ ] 3. Saved answers from older versions (removed questions, old fields), backup/restore, start over
- [ ] 4. Layout: every page at 320/390/desktop, light + dark
- [ ] 5. Results details: cards, search, live bar, summary text, PDF, links
- [ ] 6. Performance (load + live bar speed)
- [ ] 7. Fix findings, retest, finish PR, delete this file

## Findings
