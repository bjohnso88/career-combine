# Career Combine

**Live at [careercombine.bixjohnson.com](https://careercombine.bixjohnson.com)** ·
write-up at [bixjohnson.com/projects/career-combine](https://bixjohnson.com/projects/career-combine)

A free, private career assessment that runs entirely in the browser. You drop in
your résumé and answer a few rounds of questions about what you enjoy and how you
like to work. You get back a scouting report: 46 careers ranked by fit, the reasons
behind each one, red flags, and stepping-stone jobs you could land now.

It's built like a sports combine. Instead of drafting on vibes, you run the
drills and the results come from your answers.

## What it covers

| Section | Questions | What it measures |
| --- | --- | --- |
| Check-in | Résumé + basics | Skills found on your résumé, experience, education, and the field you work in |
| Interests | 30 activities, each rated twice | How much you'd **enjoy** each kind of work and how **good** you are at it now (Holland RIASEC) |
| Personality | 30 statements | Big Five traits, using public-domain IPIP items |
| Values | Ranking + 2 sliders | What matters most, plus your pay floor and 5-year pay target |
| Work style | 7 sliders | Travel, coding, commission, hours, remote vs. on-site, people time, more school |
| True/false | 18 | Quick gut calls on work preferences |
| This or that | 12 | Forced choices between two kinds of work |
| Scenarios | 12 | What you'd actually do in real work situations, worded for your field |
| Your path | 6 | Where you are now, why you're looking, and what's in the way |
| Your field | 4–6 | Questions only for your field, like law school and practice areas for legal, or shifts and patient care for healthcare |
| Your words | 8 open-ended | Not scored. These go into the AI summary |

Interests stay broad on purpose and cover every kind of work, not just your
current field. Rating things outside your world is how the tool rules careers out.

## What you get

- **Best-fit careers:** all 46 are scored, and the top 10 are shown in detail with
  reasons, red flags, pay ranges, ease of entry, typical education, AI exposure,
  job titles to search for, and a first move.
- **Within your field:** if you picked a field, which corner of it suits you
  (for example family law vs. corporate vs. legal ops).
- **Your profile:** interest code, Big Five, an "enjoy vs. good at" breakdown,
  work-style meters, and your values.
- **Stepping-stone jobs:** roles you could likely get hired for soon with skills
  already on your résumé, and where each one leads.
- **AI coach summary:** a copy-paste prompt with every answer, your résumé, and
  instructions, for Claude, ChatGPT, or any AI assistant to go deeper.

## Privacy

Nothing leaves the browser. There's no server, account, or tracking. The résumé
is read on the visitor's device, and answers are saved in that browser's
`localStorage` so people can stop and come back. A backup/restore option on the
start page moves answers between devices.

The only outside requests are Google Fonts, plus two résumé-reading libraries
loaded from jsDelivr when someone uploads a file:
[pdf.js](https://github.com/mozilla/pdf.js) for PDFs and
[mammoth](https://github.com/mwilliamson/mammoth.js) for Word files.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app: page, styles, questions, scoring, and results, all in one file |
| `wrangler.jsonc` | Tells Cloudflare the app's name and to serve this folder as static files (no server code) |
| `.assetsignore` | Keeps `.git`, this README, and the config files from being published with the app |
| `README.md` | This file |

## Making changes

There's no build step and nothing to install.

1. **Edit `index.html`.** See [Editing it](#editing-it) for where each question
   set and the career list live.
2. **Check it locally:** open `index.html` in a browser and click through. Try a
   phone-sized window too.
3. **Push to `main`.** Cloudflare rebuilds automatically, and
   careercombine.bixjohnson.com updates in a minute or two. Branches and pull
   requests get their own preview link instead of changing the live app.

To check that Cloudflare will accept the files before pushing, run
`npx wrangler deploy --dry-run` in this folder.

The app is fully separate from the main website. It has its own styles, and it
links to bixjohnson.com only in its header and footer, so changes to the website
never break it.

## How scoring works

Every answer adds evidence to 17 work-style traits: coding, travel, selling,
people time, leading, independence, variety, pressure, data, hands-on work,
commission pay, long hours, on-site work, writing, presenting, building your own
thing, and purpose. Each career has a demand level on the same traits.

A career's fit score blends:

- **Interest match (about a third):** your RIASEC profile against the career's
  three-letter code.
- **Work-style match (about half):** the gap between what you want and what the
  job demands. Gaps count more when a job demands *more* of something you want to
  avoid (coding, selling, commission, travel, hours) than when it offers less.
- **Pay match:** typical pay against your floor and 5-year target, weighted by
  how high you ranked pay.
- **Smaller boosts:** abilities you rated high, skills on your résumé, and your
  field-question answers.

Dealbreakers subtract points and show up as "Watch out for" flags, for example
heavy selling when you said you'd avoid it, or a degree you said you won't get.

**Nothing is presumed.** Only real answers count:

- Unanswered questions add nothing. They aren't filled in with a "middle" answer.
- Pay only matters once you've set your pay numbers.
- Picking a field doesn't push careers up or down by itself. Your answers to the
  field questions do, and they count extra because they're things you said directly
  (like "I'd rather avoid blood completely").
- No ranking is shown until you've answered at least 20 questions, including some
  interests or work-style questions.
- Early scores are pulled toward the middle and grow to full strength as you
  answer more, so a handful of answers can't look like a sure thing. This changes
  the numbers, not the order.

**Live matches.** Once there's enough to go on, a bar at the bottom of every
question page shows your current top matches. It updates after each answer, with
arrows when a career moves up or down. Tap **Top 5** to expand it.

## Editing it

Everything lives in the `<script>` section of `index.html`, organized as plain
data you can edit without touching the logic.

| To change… | Edit |
| --- | --- |
| Interest activities | `RI` |
| Personality items | `B5` (keep the IPIP wording) |
| Values, sliders | `VALUES`, `SLIDERS` |
| True/false, this-or-that | `TF`, `AB` |
| Scenarios | `SJT` (uses `{tokens}` filled in per field) |
| Field wording for scenarios | `FIELDS` |
| Field-specific questions and directions | `FIELDQ` |
| Career-path questions | `PATHQ` |
| Open-ended questions | `OPEN` |
| Careers | `C` |
| Stepping-stone jobs | `STEPS` |
| Skills detected from a résumé | `SK` |
| How much each trait matters | `SPEC` |

Answer options carry their scoring inline. In `["Love it — run with it",{au:1,v:.9}]`,
picking that answer is evidence for high independence (`au`) and high variety (`v`).
The trait keys are listed at the top of the script.

**Adding a career:** copy an entry in `C`, then set its RIASEC code (`r`), pay
(entry, about year 4, senior, in $k), demand levels (`d`), education level
(`edu`: 0 none, 1 certificate, 2 bachelor's, 3 graduate), core skills (`sk`), and
the text fields.

## Limits

This is a self-reflection tool, not a validated psychological assessment. Career
profiles and pay figures are rough U.S. estimates and judgment calls. They aren't
pulled from O*NET or the Bureau of Labor Statistics. Treat the top results as a
shortlist to test against real job postings and conversations, not a verdict.

## Background

Interests are modeled on Holland's RIASEC types, the framework behind the U.S.
Department of Labor's O*NET Interest Profiler. Personality items come from
Goldberg's public-domain International Personality Item Pool (IPIP). The
scenarios use the situational-judgment format.

---

Built by [Bix Johnson](https://bixjohnson.com).
