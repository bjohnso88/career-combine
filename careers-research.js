/* Career research: a deeper look at each career, written by Claude from cited sources and
   reviewed by Bix (pull request) before it goes live. Keyed by career id from careers.js or
   careers-bls.js. Unlike careers-bls.js, the monthly data rebuild never touches this file.
   Add or refresh careers with the weekly research task; see "Career research" in README.md.
   Check with: node tools/research.mjs check

   Fields (plain text, a few sentences each, no HTML):
     checked    date researched, YYYY-MM-DD
     pay        pay right now: BLS figures plus what job postings offer, with years
     growth     outlook: BLS projection and whether recent hiring news agrees
     ai         {rating: Low | Low–Medium | Medium | Medium–High | High, text: what AI does and doesn't do here}
     sentiment  what people in the job say (forums, social media, news), in our own words
     path       realistic ways in, usual steps and years, and what comes next
     notes      licenses, physical demands, unions, regional differences, red flags
     sources    [["Title", "https://..."], ...] at least 3 */
"use strict";
const CAREER_RESEARCH={
 "se":{checked:"2026-10-14",
  pay:"BLS median is $124,900 a year (May 2025); the lowest 10% earn under $73,870 and the top 10% over $195,270. Pay is usually salary plus commission or bonus. Enterprise software roles pay well above the BLS median: a 2026 recruiter benchmark puts base at about $130k early on to $200–225k senior, plus $35–80k variable (roughly a 75/25 split).",
  growth:"BLS projects 3% growth from 2025 to 2035 (about average), with about 3,800 openings a year in a small field of roughly 51,600 jobs. Recruiters report demand is strongest in AI, cloud infrastructure, and cybersecurity, where experienced sales engineers are scarce.",
  ai:{rating:"Low–Medium",text:"AI is taking over the prep work: researching prospects, drafting RFP answers and demo scripts, call notes, and simple self-guided demos. The human core stays: reading what a buyer really needs, live demos and workshops, handling technical objections, and earning trust over a long sales cycle. Expect fewer people doing routine demos and more value on deep product and industry knowledge."},
  sentiment:"People in the role like the pay, the mix of technical and people work, and being seen as a key part of closing deals. The most common complaint is workload and burnout, especially early and mid-career, followed by friction with account executives (worse at small companies) and keeping up with fast-changing AI products. Since pay depends partly on sales results, income can swing with the market.",
  path:"Most people come in from technical support, implementation, consulting, or software and systems roles at a company that sells technical products, usually after 1–3 years. A bachelor's degree (engineering, computer science, or business) is typical but not strictly required if you have sales and technical experience. Next steps are senior or principal sales engineer, solutions architect, or managing a sales engineering team.",
  notes:"Expect travel (sometimes several days a month) and some weeks over 40 hours. Product knowledge matters more than credentials; vendor certifications (for example cloud certifications) help, and NAASE offers a Certified Sales Engineer credential. Part of pay is tied to quota, so check how the variable pay is earned before accepting an offer.",
  sources:[["BLS Occupational Outlook Handbook: Sales Engineers","https://www.bls.gov/ooh/sales/sales-engineers.htm"],["Betts Recruiting: Enterprise sales engineer compensation trends for 2026","https://bettsrecruiting.com/blog/top-enterprise-sales-engineer-compensation-trends-for-2026/"],["Demoboost (vendor blog): How AI is changing presales and the solution engineer role in 2026","https://demoboost.com/blog/presales-solution-engineer-ai-era"],["NAASE: What sales engineers struggle with most today (Nov 2025 poll)","https://sales-engineering.org/what-sales-engineers-are-really-struggling-with-right-now/"]]},
};
