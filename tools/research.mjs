// Career research helper (no dependencies; Node 18+).
//
//   node tools/research.mjs next [N]   which careers to research next (default 20), as JSON
//   node tools/research.mjs check      validate careers-research.js; exits 1 on problems
//   node tools/research.mjs status     how many careers are researched, and how old the oldest is
//
// Order for "next":
//   1. Careers with no research yet: the hand-tuned careers (careers.js) first, since they
//      show up in the most results; then generated careers in tech, healthcare, and the
//      trades (SOC groups 15, 29, 31, 47, 49), biggest employment first; then everything
//      else, biggest employment first.
//   2. Once every career has research: the oldest "checked" date first, so each career
//      gets re-checked about once a year.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (file, name) => {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(p, "utf8") + `;this.__v=typeof ${name}!=="undefined"?${name}:null;`, ctx, { filename: file });
  return ctx.__v;
};

const hand = load("careers.js", "CAREERS_HAND") || [];
const gen = load("careers-bls.js", "CAREERS_BLS") || [];
const research = load("careers-research.js", "CAREER_RESEARCH") || {};

// Generated careers already covered by a hand-tuned one are researched under the hand-tuned id.
const handSoc = new Set(hand.flatMap(h => h.soc || []));
const careers = [
  ...hand.map((c, i) => ({ id: c.id, n: c.n, soc: (c.soc || []).join(", "), group: 0, order: i, emp: 0, hand: true })),
  ...gen.filter(g => !(g.bls && handSoc.has(g.bls.soc))).map(g => {
    const major = (g.bls && g.bls.soc || "").slice(0, 2);
    return { id: g.id, n: g.n, soc: g.bls ? g.bls.soc : "", group: ["15", "29", "31", "47", "49"].includes(major) ? 1 : 2, order: 0, emp: (g.bls && g.bls.emp) || 0, hand: false };
  }),
];
const byId = Object.fromEntries(careers.map(c => [c.id, c]));

const cmd = process.argv[2] || "status";

if (cmd === "next") {
  const n = Math.max(1, parseInt(process.argv[3] || "20", 10));
  const fresh = careers.filter(c => !research[c.id])
    .sort((a, b) => a.group - b.group || a.order - b.order || b.emp - a.emp);
  const stale = careers.filter(c => research[c.id])
    .sort((a, b) => String(research[a.id].checked).localeCompare(String(research[b.id].checked)));
  const pick = [...fresh, ...stale].slice(0, n).map(c => ({
    id: c.id, name: c.n, soc: c.soc, file: c.hand ? "careers.js" : "careers-bls.js",
    lastChecked: research[c.id] ? research[c.id].checked : null,
  }));
  console.log(JSON.stringify(pick, null, 1));
} else if (cmd === "check") {
  const problems = [];
  const today = new Date().toISOString().slice(0, 10);
  const TEXT = ["pay", "growth", "sentiment", "path", "notes"];
  for (const [id, r] of Object.entries(research)) {
    const at = `${id}:`;
    if (!byId[id]) problems.push(`${at} no career has this id (hand-tuned ids are used for careers that cover a BLS job)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked || "") || r.checked > today) problems.push(`${at} "checked" must be a YYYY-MM-DD date, not in the future`);
    for (const k of TEXT) if (typeof r[k] !== "string" || r[k].trim().length < 20) problems.push(`${at} "${k}" is missing or too short`);
    for (const k of TEXT) if (typeof r[k] === "string" && r[k].length > 700) problems.push(`${at} "${k}" is over 700 characters; tighten it`);
    if (!r.ai || !["Low", "Low–Medium", "Medium", "Medium–High", "High"].includes(r.ai.rating)) problems.push(`${at} ai.rating must be Low, Low–Medium, Medium, Medium–High, or High (en dash)`);
    if (!r.ai || typeof r.ai.text !== "string" || r.ai.text.trim().length < 20) problems.push(`${at} ai.text is missing or too short`);
    if (!Array.isArray(r.sources) || r.sources.length < 3) problems.push(`${at} needs at least 3 sources`);
    else r.sources.forEach((s, i) => {
      if (!Array.isArray(s) || typeof s[0] !== "string" || !/^https:\/\//.test(s[1] || "")) problems.push(`${at} source ${i + 1} must be ["Title", "https://..."]`);
    });
    const extra = Object.keys(r).filter(k => ![...TEXT, "ai", "sources", "checked"].includes(k));
    if (extra.length) problems.push(`${at} unknown field(s): ${extra.join(", ")}`);
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`careers-research.js OK: ${Object.keys(research).length} careers`);
} else if (cmd === "status") {
  const done = careers.filter(c => research[c.id]);
  const dates = done.map(c => research[c.id].checked).sort();
  console.log(`${done.length} of ${careers.length} careers researched` + (dates.length ? `; oldest check ${dates[0]}, newest ${dates[dates.length - 1]}` : ""));
} else {
  console.error("usage: node tools/research.mjs next [N] | check | status");
  process.exit(2);
}
