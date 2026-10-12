# Question review — working checklist (delete before merging)

Bix (Oct 12): testers found some questions wordy or near-duplicates (e.g. "lead the
team vs. be the trusted expert advisor"). Review every question, cut duplicates,
tighten wording. Branch `claude/question-review`, PR to `main`, Bix merges.

## Decisions
- Personality items are IPIP; reworded only where a pair mirrors itself. Replaced
  with other items from the same IPIP 50-item set and trait, so scoring stays valid.
- Scoring tags on kept answers don't change.

## Steps (commit + push after each)
- [x] 1. Interests: split the 3 look-alike "equipment" items; ri30 overlapped ri6/ri18
- [x] 2. Personality: replace mirror pairs (b4/b19, b5/b20, b10/b30, b8/b18, b2/b22/b27); shorter ledes
- [x] 3. Values & sliders: shorter wording
- [x] 4. True/false & this-or-that: drop duplicates of sliders/other items (tf4, tf6, tf10, tf11, tf18, ab4, ab6, ab8, ab9, ab10, ab12); tighten wording
- [ ] 5. Scenarios: drop sj7 (same as sj1); tighten options
- [ ] 6. Career path & open-ended: tighten wording
- [ ] 7. Field questions: fix overlaps (tc1 vs sj1, sv4 vs pay slider) and wordy ones (lg3, lg4)
- [ ] 8. Test every field, update README counts, finish PR, delete this file
