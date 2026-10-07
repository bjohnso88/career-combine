# Career Combine

**Live at [careercombine.bixjohnson.com](https://careercombine.bixjohnson.com)** ·
write-up at [bixjohnson.com/projects/career-combine](https://bixjohnson.com/projects/career-combine)

A free, private career assessment that runs entirely in the browser. You drop in
your resume and answer a few rounds of questions about what you enjoy and how you
like to work. You get back a scouting report: about 760 careers (every U.S. occupation with national wage data) ranked by fit, the reasons
behind each one, red flags, and stepping-stone jobs you could land now.

It's built like a sports combine. Instead of drafting on vibes, you run the
drills and the results come from your answers.

## What it covers

| Section | Questions | What it measures |
| --- | --- | --- |
| Check-in | Resume + basics | Skills found on your resume, experience, education, and the field you work in |
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

- **Best-fit careers:** every career is scored, and the top 10 are shown in detail with
  reasons, red flags, pay ranges, ease of entry, typical education, AI exposure,
  job titles to search for, a first move, and official BLS numbers (median pay,
  pay range, how many people do the job, projected growth) with links.
- **Look up any career:** a search box shows where any job lands for you, even
  if it isn't in your top 10.
- **Within your field:** if you picked a field, which corner of it suits you
  (for example family law vs. corporate vs. legal ops).
- **Your profile:** interest code, Big Five, an "enjoy vs. good at" breakdown,
  work-style meters, and your values.
- **Stepping-stone jobs:** roles you could likely get hired for soon with skills
  already on your resume, and where each one leads.
- **AI coach summary:** a copy-paste prompt with every answer, your resume, and
  instructions, for Claude, ChatGPT, or any AI assistant to go deeper.

## Privacy

Nothing leaves the browser. There's no server, account, or tracking. The resume
is read on the visitor's device, and answers are saved in that browser's
`localStorage` so people can stop and come back. A backup/restore option on the
start page moves answers between devices.

The only outside requests are Google Fonts, plus two resume-reading libraries
loaded from jsDelivr when someone uploads a file:
[pdf.js](https://github.com/mozilla/pdf.js) for PDFs and
[mammoth](https://github.com/mwilliamson/mammoth.js) for Word files.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app: page, styles, questions, scoring, and results |
| `careers.js` | The 46 hand-tuned careers. Edit these by hand |
| `careers-bls.js` | Every other U.S. occupation, generated from BLS and O*NET data. Don't edit by hand; rebuild it (see [Career data](#career-data)) |
| `tools/` | The script that builds `careers-bls.js` and its download helper. Not published |
| `source-data/bls/` | The two BLS files the build uses (see [Career data](#career-data)). Not published |
| `.github/workflows/build-careers.yml` | The GitHub Action that rebuilds `careers-bls.js` on GitHub's servers |
| `wrangler.jsonc` | Tells Cloudflare the app's name and to serve this folder as static files (no server code) |
| `.assetsignore` | Keeps `.git`, this README, the build tools, and the config files from being published with the app |
| `README.md` | This file |

## Making changes

There's no build step for the app itself and nothing to install.

1. **Edit `index.html` or `careers.js`.** See [Editing it](#editing-it) for where
   each question set and the career list live.
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
- **Smaller boosts:** abilities you rated high, skills on your resume, and your
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
| Hand-tuned careers | `CAREERS_HAND` in `careers.js` |
| All other careers | `careers-bls.js` (generated; see below) |
| Stepping-stone jobs | `STEPS` |
| Skills detected from a resume | `SK` |
| How much each trait matters | `SPEC` |

Answer options carry their scoring inline. In `["Love it — run with it",{au:1,v:.9}]`,
picking that answer is evidence for high independence (`au`) and high variety (`v`).
The trait keys are listed at the top of the script.

**Adding or hand-tuning a career:** copy an entry in `careers.js`, then set its
RIASEC code (`r`), pay (entry, about year 4, senior, in $k), demand levels (`d`),
education level (`edu`: 0 none, 1 certificate, 2 bachelor's, 3 graduate), core
skills (`sk`), and the text fields. Add `soc` with the BLS occupation codes it
covers (for example `["15-1252"]` for software developers). The generated entry
for that code is then folded into yours: your profile is used for scoring and
the card shows the official BLS numbers.

## Career data

Besides the 46 hand-tuned careers, the app includes every occupation the Bureau
of Labor Statistics publishes national wages for, about 710 more after overlaps (catch-all "All Other" groups are left out). They live in
`careers-bls.js`, which `tools/build-careers.mjs` builds from three public sources:

- **BLS Occupational Employment and Wage Statistics (OEWS):** pay percentiles and
  how many people do each job. Pay is `[entry, ~year 4, senior]` = average of the
  10th/25th percentiles, the median, and average of the 75th/90th percentiles.
- **BLS Employment Projections:** 10-year growth, yearly openings, and typical
  education and experience needed to start.
- **O\*NET 31.0** (U.S. Department of Labor): interest scores and ratings of what
  each job involves. These become the RIASEC code and the 17 demand levels. Each
  trait is then scaled with a straight-line fit against the hand-tuned careers
  that cover the same job, so both kinds of career score on the same scale.
  Travel and commission pay have no O\*NET measure and use rules by job family.
  Jobs with thin O\*NET data borrow from similar jobs and are marked on their card.

`tools/build-report.md` lists how well each trait agrees with the hand-tuned
careers, which occupations were skipped and why, and a spot check of the results.

**Rebuilding it.** The GitHub Action in `.github/workflows/build-careers.yml` does
this on GitHub's servers whenever `tools/` or `source-data/` changes on the
working branch, and can be run by hand from the repo's **Actions** tab. It
downloads O\*NET, rebuilds `careers-bls.js`, commits it, and saves the exact
source files it used to the `career-data` branch.

bls.gov blocks downloads from cloud servers, so the two BLS files are added by
hand to `source-data/bls/` once a year: the OEWS national zip (wages, released
each spring) and `occupation.xlsx` (projections, released each fall). Links are
in `source-data/bls/README.md`.

To build on your own computer instead: `bash tools/fetch-data.sh`, then
`cd tools && npm ci && cd ..`, then `node tools/build-careers.mjs`.

## Limits

This is a self-reflection tool, not a validated psychological assessment. The
hand-tuned careers' profiles and pay are judgment calls. The generated careers
use official BLS pay and O\*NET job data, but turning that data into the app's
17 traits is an approximation, and national pay can differ a lot from local pay.
AI exposure isn't rated for the generated careers yet. Treat the top results as
a shortlist to test against real job postings and conversations, not a verdict.

## Background

Interests are modeled on Holland's RIASEC types, the framework behind the U.S.
Department of Labor's O*NET Interest Profiler. Personality items come from
Goldberg's public-domain International Personality Item Pool (IPIP). The
scenarios use the situational-judgment format.

This app includes information from [O\*NET OnLine](https://www.onetonline.org/)
and the O\*NET 31.0 Database by the U.S. Department of Labor, Employment and
Training Administration (USDOL/ETA), used under the
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. USDOL/ETA has
not approved, endorsed, or tested these modifications. O\*NET® is a trademark of
USDOL/ETA. Wage and projection data come from the U.S. Bureau of Labor Statistics.

---

Built by [Bix Johnson](https://bixjohnson.com).
