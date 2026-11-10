// Builds careers-bls.js: one career for every U.S. occupation BLS publishes wages for,
// with a fingerprint computed from O*NET data on what the job actually involves.
//
//   bash tools/fetch-data.sh        # downloads the data into data/
//   node tools/build-careers.mjs    # writes careers-bls.js and tools/build-report.md
//
// How each part of the fingerprint is made:
//   r      RIASEC code: the three highest O*NET interest scores.
//   pay    [entry, ~year 4, senior] in $k: average of BLS 10th/25th percentiles, the median,
//          and average of the 75th/90th percentiles (OEWS national, annual wages).
//          Physicians and surgeons (29-1211 to 29-1249) use [median, average of median/75th,
//          average of 75th/90th] instead: their low percentiles include part-time and reduced-hours
//          doctors, so the 10th/25th fall far below what a new doctor earns after residency
//          (2025–26 physician surveys put typical starting offers near the BLS median).
//   d      17 demand levels (0–1): O*NET work activities, work context, and skills, each
//          rescaled, then calibrated against the hand-tuned careers in careers.js that cover
//          the same occupation, so both kinds sit on the same scale. Travel, commission pay,
//          and "building your own thing" have no O*NET measure and use rules by job family.
//   edu    BLS typical entry education (Employment Projections), or the O*NET job zone.
//   sk     resume skills (ids from SK in index.html) from O*NET knowledge, skills and tools.
//   bls    the official numbers shown on the card, with links.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const report = [];
const log = (...a) => { const s = a.join(" "); console.log(s); report.push(s); };

/* ---------------- reading the data files ---------------- */
function readSheetFile(file, want) {
  const wb = XLSX.readFile(file, { dense: true });
  let best = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    // The header row is the first row that contains every wanted column (BLS files have title rows above it).
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const hdr = (rows[i] || []).map(h => String(h ?? "").replace(/\s+/g, " ").trim());
      if (want.every(w => hdr.some(h => w.test(h)))) { best = { rows, i, hdr, name }; break; }
    }
    if (best) break;
  }
  if (!best) throw new Error(`No sheet in ${path.basename(file)} has columns ${want.join(", ")}`);
  const { rows, i, hdr } = best;
  return rows.slice(i + 1).filter(r => r && r.some(v => v != null)).map(r => Object.fromEntries(hdr.map((h, j) => [h, r[j]])));
}
function readTxt(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const hdr = lines[0].split("\t");
  return lines.slice(1).map(l => { const c = l.split("\t"); return Object.fromEntries(hdr.map((h, j) => [h, c[j]])); });
}
// O*NET renames files between releases (31.0 split "Skills" into Essential and Transferable
// Skills, renamed "Interests" to "Career Interest Types"). Each table lists every name it has used;
// all that exist are read and combined.
function onet(names, required = true) {
  names = [].concat(names);
  const rows = [], used = [];
  for (const name of names) for (const ext of [".txt", ".xlsx"]) {
    const f = path.join(DATA, "onet", name + ext);
    if (!fs.existsSync(f)) continue;
    for (const r of (ext === ".txt" ? readTxt(f) : readSheetFile(f, [/^O\*NET-SOC Code$/]))) rows.push(r);
    used.push(name + ext); break;
  }
  if (!used.length) { if (required) throw new Error(`Missing O*NET file: ${names.join(" or ")}`); log(`- Optional O*NET file not found: ${names.join(" or ")}`); }
  return rows;
}
const col = (row, re) => { for (const k in row) if (re.test(k)) return row[k]; return undefined; };
const num = v => { if (v == null || v === "") return null; const n = Number(String(v).replace(/[,$\s]/g, "")); return Number.isFinite(n) ? n : null; };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const r2 = x => Math.round(x * 100) / 100;

/* ---------------- BLS: wages and employment (OEWS national) ---------------- */
const oewsDir = path.join(DATA, "oews");
const oewsFile = fs.readdirSync(oewsDir).find(f => /^national.*\.xlsx$/i.test(f)) || fs.readdirSync(oewsDir).find(f => /\.xlsx$/i.test(f));
if (!oewsFile) throw new Error("No OEWS national .xlsx in data/oews");
const OEWS_YEAR = fs.existsSync(path.join(oewsDir, "VERSION.txt")) ? fs.readFileSync(path.join(oewsDir, "VERSION.txt"), "utf8").trim() : "";
const TOP = 239.2; // BLS top-codes very high wages; marked "#" in the file
const wage = v => { if (v === "#" || v === " #") return { k: null, top: true }; const n = num(v); return { k: n == null ? null : n / 1000, top: false }; };
const oews = {};
for (const row of readSheetFile(path.join(oewsDir, oewsFile), [/^OCC_CODE$/i, /^A_MEDIAN$/i])) {
  const grp = String(col(row, /^O_GROUP$|^OCC_GROUP$/i) || "").toLowerCase();
  const code = String(col(row, /^OCC_CODE$/i) || "");
  if (grp && grp !== "detailed") continue;
  if (!/^\d\d-\d{4}$/.test(code) || code.endsWith("0000")) continue;
  const w = k => wage(col(row, new RegExp("^" + k + "$", "i")));
  const p = { p10: w("A_PCT10"), p25: w("A_PCT25"), med: w("A_MEDIAN"), p75: w("A_PCT75"), p90: w("A_PCT90") };
  if (p.med.k == null && !p.med.top) continue; // no annual wage published (some hourly-only jobs)
  oews[code] = { title: String(col(row, /^OCC_TITLE$/i)).trim().replace(/\s*--\s*/g, " – "), emp: num(col(row, /^TOT_EMP$/i)), p };
}
log(`OEWS (${OEWS_YEAR || oewsFile}): ${Object.keys(oews).length} detailed occupations with annual wages`);

/* ---------------- BLS: Employment Projections (optional) ---------------- */
const ep = {};
const epFile = path.join(DATA, "ep-occupation.xlsx");
if (fs.existsSync(epFile)) {
  try {
    const rows = readSheetFile(epFile, [/Matrix code/i, /Employment change, percent/i, /education/i]);
    for (const row of rows) {
      const code = String(col(row, /Matrix code/i) || "").trim();
      const type = String(col(row, /Occupation type/i) || "Line item");
      if (!/^\d\d-\d{4}$/.test(code) || !/line item/i.test(type)) continue;
      ep[code] = {
        growth: num(col(row, /Employment change, percent/i)),
        openings: num(col(row, /openings/i)),
        edu: col(row, /Typical education/i) || null,
        exp: col(row, /Work experience/i) || null,
        ojt: col(row, /on-the-job training/i) || null,
      };
    }
    log(`Employment Projections: ${Object.keys(ep).length} occupations`);
  } catch (e) { log(`- Employment Projections not used: ${e.message}`); }
} else log("- Employment Projections file not found; growth and BLS education are left out");

/* ---------------- O*NET: one value per SOC code per element ---------------- */
// O*NET codes are SOC codes plus a suffix (15-1252.00, 29-1229.01...). Use the .00 profile when
// it has data, otherwise the average of the detailed profiles under that SOC code.
function bySoc(rows, filter, valueOf) {
  const acc = {}; // soc -> onetCode -> [values]
  for (const row of rows) {
    if (!filter(row)) continue;
    const oc = String(row["O*NET-SOC Code"]); const soc = oc.slice(0, 7);
    const v = valueOf(row); if (v == null) continue;
    ((acc[soc] ??= {})[oc] ??= []).push(v);
  }
  const out = {};
  for (const soc in acc) {
    const m = acc[soc]; const main = m[soc + ".00"];
    out[soc] = main ? mean(main) : mean(Object.values(m).map(mean));
  }
  return out;
}
const isSuppressed = r => String(r["Recommend Suppress"] || "").toUpperCase() === "Y" || String(r["Not Relevant"] || "").toUpperCase() === "Y";
function elements(rows, scale, names) {
  const out = {}, missing = [];
  for (const [key, re] of Object.entries(names)) {
    const found = rows.some(r => re.test(r["Element Name"]) && r["Scale ID"] === scale);
    if (!found) { missing.push(key); continue; }
    out[key] = bySoc(rows, r => r["Scale ID"] === scale && re.test(r["Element Name"]) && !isSuppressed(r), r => num(r["Data Value"]));
  }
  if (missing.length) log(`- O*NET elements not found (${scale}): ${missing.join(", ")}`);
  return out;
}

const ONET_VERSION = fs.existsSync(path.join(DATA, "onet", "VERSION.txt")) ? fs.readFileSync(path.join(DATA, "onet", "VERSION.txt"), "utf8").trim() : "";
const occData = onet("Occupation Data");
const onetTitle = {}, onetDesc = {}, onetCodes = {};
for (const r of occData) {
  const oc = String(r["O*NET-SOC Code"]); const soc = oc.slice(0, 7);
  (onetCodes[soc] ??= []).push(oc);
  if (oc.endsWith(".00") || !onetTitle[soc]) { onetTitle[soc] = r.Title; onetDesc[soc] = r.Description; }
}

const interestRows = onet(["Interests", "Career Interest Types"]);
const RIASEC = { R: /^Realistic$/, I: /^Investigative$/, A: /^Artistic$/, S: /^Social$/, E: /^Enterprising$/, C: /^Conventional$/ };
const interest = elements(interestRows, "OI", RIASEC); // 1–7

const act = elements(onet("Work Activities"), "IM", { // importance 1–5
  sell: /^Selling or Influencing Others$/,
  guide: /^Guiding, Directing, and Motivating Subordinates$/,
  coord: /^Coordinating the Work and Activities of Others$/,
  analyze: /^Analyzing Data or Information$/,
  process: /^Processing Information$/,
  physical: /^Performing General Physical Activities$/,
  handle: /^Handling and Moving Objects$/,
  repair: /^Repairing and Maintaining Mechanical Equipment$/,
  care: /^Assisting and Caring for Others$/,
  creative: /^Thinking Creatively$/,
  public: /^Performing for or Working Directly with the Public$/,
  outside: /^Communicating with People Outside the Organization$/,
  teach: /^Training and Teaching Others$/,
  strategy: /^Developing Objectives and Strategies$/,
  document: /^Documenting\/Recording Information$/,
  computers: /^Working with Computers$/,
});
const skillRows = onet(["Skills", "Essential Skills", "Transferable Skills"]);
// Importance (1–5) rather than level: O*NET flags many skill levels as low-confidence ("suppress").
const skill = elements(skillRows, "IM", {
  programming: /^Programming$/, writing: /^Writing$/, speaking: /^Speaking$/, math: /^Mathematics$/,
  science: /^Science$/, troubleshooting: /^Troubleshooting$/, money: /^Management of Financial Resources$/,
  persuasion: /^Persuasion$/, negotiation: /^Negotiation$/, instructing: /^Instructing$/,
});
const contextRows = onet("Work Context");
// Work context means are on a 1–5 scale (CX), except a few on 1–3 (CT), like the length of the work week.
const ctxScaleMax = {}; for (const r of contextRows) if (r["Scale ID"] === "CX") ctxScaleMax[r["Element Name"]] = 5; else if (r["Scale ID"] === "CT") ctxScaleMax[r["Element Name"]] ??= 3;
function context(names) {
  const out = {}, missing = [];
  for (const [key, re] of Object.entries(names)) {
    const name = Object.keys(ctxScaleMax).find(n => re.test(n));
    if (!name) { missing.push(key); continue; }
    const scale = ctxScaleMax[name] === 5 ? "CX" : "CT";
    const raw = bySoc(contextRows, r => r["Scale ID"] === scale && r["Element Name"] === name && !isSuppressed(r), r => num(r["Data Value"]));
    out[key] = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v - 1) / (ctxScaleMax[name] - 1)]));
  }
  if (missing.length) log(`- O*NET work context items not found: ${missing.join(", ")}`);
  return out;
}
const ctx = context({
  customers: /^Deal With External Customers/,
  contact: /^Contact With Others$/,
  freedom: /^Freedom to Make Decisions$/,
  unstructured: /^Structured versus Unstructured Work$|^Determine Tasks, Priorities and Goals$/,
  repeat: /^Importance of Repeating Same Tasks$/,
  time: /^Time Pressure$/,
  week: /^Duration of Typical Work Week$/,
  outdoors: /^Outdoors, Exposed to (All )?Weather/,
  proximity: /^Physical Proximity$/,
  publicSpeaking: /^Public Speaking$/,
  conflict: /^(Frequency of )?Conflict Situations$/,
});
const knowledge = elements(onet("Knowledge"), "IM", {
  customer: /^Customer and Personal Service$/, sales: /^Sales and Marketing$/, accounting: /^Economics and Accounting$/,
  medicine: /^Medicine and Dentistry$/, law: /^Law and Government$/, education: /^Education and Training$/,
  mechanical: /^Mechanical$/, engineering: /^Engineering and Technology$/, design: /^Design$/, therapy: /^Therapy and Counseling$/,
  safety: /^Public Safety and Security$/, hr: /^Personnel and Human Resources$/, media: /^Communications and Media$/,
  admin: /^Administrative$/, admin2: /^Administration and Management$/, computers: /^Computers and Electronics$/,
  biology: /^Biology$/, chemistry: /^Chemistry$/, production: /^Production and Processing$/, transport: /^Transportation$/,
  food: /^Food Production$/, building: /^Building and Construction$/, psychology: /^Psychology$/, math: /^Mathematics$/,
  fineArts: /^Fine Arts$/, physics: /^Physics$/,
});
const jobZone = bySoc(onet("Job Zones"), () => true, r => num(r["Job Zone"]));
const titleRows = onet("Sample of Reported Titles", false);
const reportedTitles = {};
for (const r of titleRows) {
  const soc = String(r["O*NET-SOC Code"]).slice(0, 7);
  const t = r["Reported Job Title"]; if (!t) continue;
  const shown = String(r["Shown in My Next Move"] || "").toUpperCase() === "Y";
  (reportedTitles[soc] ??= []).push({ t, shown });
}
const techRows = onet(["Technology Skills", "Software Skills"], false);
const tech = {};
for (const r of techRows) {
  const soc = String(r["O*NET-SOC Code"]).slice(0, 7);
  // Only tools employers list as in demand for this job (otherwise Excel and SQL show up everywhere).
  const flag = r["In Demand"] ?? r["Hot Technology"];
  if (String(flag || "").toUpperCase() !== "Y") continue;
  (tech[soc] ??= new Set()).add(String(r["Workplace Example"] || r.Example || ""));
}

/* ---------------- raw features (0–1) for the 17 traits ---------------- */
const im = (k, soc) => act[k]?.[soc] == null ? null : clamp((act[k][soc] - 1) / 4);
const lv = (k, soc) => skill[k]?.[soc] == null ? null : clamp((skill[k][soc] - 1) / 4);
const cx = (k, soc) => ctx[k]?.[soc] ?? null;
const kn = (k, soc) => knowledge[k]?.[soc] == null ? null : clamp((knowledge[k][soc] - 1) / 4);
const avg = (...xs) => { const v = xs.filter(x => x != null); return v.length ? mean(v) : null; };
const ri = (L, soc) => interest[L]?.[soc] == null ? null : clamp((interest[L][soc] - 1) / 6);

// Rules for traits O*NET doesn't measure. Codes are SOC prefixes; the longest match wins.
const TRAVEL = { "41-4": .45, "41-9031": .45, "41-3": .3, "41-3041": .2, "41-2": .05, "13-1111": .5, "13-1121": .4, "13-2011": .2,
  "53-3032": .9, "53-3033": .4, "53-2011": .9, "53-2012": .7, "53-2031": .95, "53-5": .8, "27-2021": .6, "27-2012": .4, "27-2041": .4,
  "27-2042": .5, "47-": .2, "49-9": .2, "17-2": .15, "19-2": .15, "19-4": .15, "11-1011": .4, "11-2022": .35, "13-1031": .4, "13-2041": .3,
  "33-3021": .2, "39-7": .9, "25-": .05, "29-": .05, "43-": .03 };
const COMMISSION = { "41-3021": .8, "41-3031": .65, "41-9022": .95, "41-9021": .9, "41-4011": .5, "41-4012": .5, "41-3091": .5,
  "41-3011": .55, "41-9031": .4, "41-3041": .3, "41-2031": .15, "41-2022": .1, "41-2021": .3, "41-9041": .2, "41-9091": .5,
  "13-2052": .5, "13-2072": .55, "41-9011": .3 };
const rule = (table, soc, dflt) => { let best = null, len = -1; for (const p in table) if (soc.startsWith(p) && p.length > len) { best = table[p]; len = p.length; } return best ?? dflt; };

function rawTraits(soc) {
  return {
    c: lv("programming", soc),
    tr: rule(TRAVEL, soc, .1),
    s: avg(im("sell", soc), lv("persuasion", soc), kn("sales", soc)),
    cu: avg(cx("customers", soc), im("public", soc), im("outside", soc)),
    l: avg(im("guide", soc), im("coord", soc)),
    au: avg(cx("freedom", soc), cx("unstructured", soc)),
    v: cx("repeat", soc) == null ? null : 1 - cx("repeat", soc),
    p: avg(cx("time", soc), cx("conflict", soc)),
    da: avg(im("analyze", soc), im("process", soc)),
    th: avg(im("physical", soc), im("handle", soc), im("repair", soc)),
    rp: rule(COMMISSION, soc, 0),
    h: cx("week", soc),
    o: avg(Math.max(im("physical", soc) ?? 0, cx("outdoors", soc) ?? 0), cx("proximity", soc), 1 - (im("computers", soc) ?? .5)),
    w: avg(lv("writing", soc), im("document", soc)),
    pr: avg(lv("speaking", soc), cx("publicSpeaking", soc), im("teach", soc)),
    en: avg(ri("E", soc), im("strategy", soc), im("creative", soc)),
    pu: avg(im("care", soc), ri("S", soc)),
  };
}
// Some occupations have little O*NET data (new or rare ones). Fill each gap with the average
// of the most specific SOC group that has it (e.g. 29-1240 surgeons, then 29-12, then 29-).
const RAW = {}, INT = {};
const ALL_SOCS = Object.keys(oews);
for (const soc of ALL_SOCS) { RAW[soc] = rawTraits(soc); INT[soc] = Object.fromEntries("RIASEC".split("").map(L => [L, interest[L]?.[soc] ?? null])); }
const groupCache = {};
function groupMean(table, key, soc) {
  for (const n of [6, 5, 4, 3]) {
    const pre = soc.slice(0, n), ck = `${key}|${pre}`;
    if (!(ck in groupCache)) { const v = ALL_SOCS.filter(x => x !== soc && x.startsWith(pre)).map(x => table[x][key]).filter(x => x != null); groupCache[ck] = v.length ? mean(v) : null; }
    if (groupCache[ck] != null) return groupCache[ck];
  }
  return null;
}
function filled(soc) {
  const raw = { ...RAW[soc] }, ints = { ...INT[soc] }; let gaps = 0;
  for (const t in raw) if (raw[t] == null) { raw[t] = groupMean(RAW, t, soc); gaps++; }
  for (const L in ints) if (ints[L] == null) { ints[L] = groupMean(INT, L, soc); gaps++; }
  return { raw, ints, gaps };
}
const TRAITS = ["c", "tr", "s", "cu", "l", "au", "v", "p", "da", "th", "rp", "h", "o", "w", "pr", "en", "pu"];
const RULE_TRAITS = new Set(["tr", "rp"]); // already on the app's scale

/* ---------------- calibrate against the hand-tuned careers ---------------- */
const handSrc = fs.readFileSync(path.join(ROOT, "careers.js"), "utf8");
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(handSrc + ";this.HAND=CAREERS_HAND;", sandbox);
const HAND = sandbox.HAND;
const pairs = Object.fromEntries(TRAITS.map(t => [t, []]));
for (const h of HAND) for (const soc of h.soc || []) {
  if (!oews[soc]) continue;
  const raw = rawTraits(soc);
  for (const t of TRAITS) if (raw[t] != null) pairs[t].push([raw[t], h.d[t] || 0]);
}
const fit = {};
log("\n## Calibration against hand-tuned careers");
log("Each trait is rescaled with a straight-line fit from O*NET's measure to the hand-tuned values. r is how well they agree (1 = perfectly).\n");
log("| Trait | Pairs | r | Scale |"); log("|---|---|---|---|");
for (const t of TRAITS) {
  const P = pairs[t];
  if (RULE_TRAITS.has(t) || P.length < 8) { fit[t] = { a: 0, b: 1 }; log(`| ${t} | ${P.length} | – | ${RULE_TRAITS.has(t) ? "rule by job family" : "as measured (too few pairs)"} |`); continue; }
  const mx = mean(P.map(p => p[0])), my = mean(P.map(p => p[1]));
  let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of P) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  // Use the fitted slope only when the agreement is real; otherwise just match the hand-tuned average and spread.
  let b = r > .3 && sxx ? sxy / sxx : (sxx ? Math.sqrt(syy / sxx) * Math.max(r, .3) : 1);
  b = clamp(b, .5, 4);
  fit[t] = { a: my - b * mx, b };
  log(`| ${t} | ${P.length} | ${r.toFixed(2)} | y = ${fit[t].a.toFixed(2)} + ${b.toFixed(2)}x |`);
}

/* ---------------- resume skills (SK ids in index.html) ---------------- */
const TECH = { sql: /\bsql\b|mysql|postgresql|oracle database|microsoft sql server/i, excel: /microsoft excel/i, bi: /tableau|power bi|qlik|looker/i,
  python: /\bpython\b/i, cloud: /amazon web services|\baws\b|microsoft azure|google cloud/i, linux: /\blinux\b|\bunix\b/i, crm: /salesforce|hubspot/i,
  design: /adobe photoshop|adobe illustrator|adobe indesign|figma/i, cad: /autocad|solidworks|revit/i, git: /\bgit\b|github/i,
  ml: /tensorflow|pytorch|scikit/i, media: /adobe premiere|final cut|adobe after effects|avid media/i };
function skillsFor(soc) {
  const cand = [];
  const add = (id, score) => { if (score != null) cand.push([id, score]); };
  add("programming", lv("programming", soc) * 1.3);
  add("writing", (lv("writing", soc) ?? 0) * 1.1 - .1);
  add("presenting", lv("speaking", soc) - .1);
  add("math", lv("math", soc));
  add("research", lv("science", soc));
  add("troubleshooting", lv("troubleshooting", soc));
  add("budgeting", lv("money", soc));
  add("negotiation", avg(lv("negotiation", soc), kn("sales", soc)));
  add("training", im("teach", soc));
  add("leadership", im("guide", soc));
  add("customer", kn("customer", soc));
  add("sales", avg(kn("sales", soc), im("sell", soc)));
  add("accounting", kn("accounting", soc));
  add("healthcare", kn("medicine", soc));
  add("legal", kn("law", soc));
  add("teaching", kn("education", soc));
  add("handson", avg(kn("mechanical", soc), im("repair", soc)));
  add("engineering", kn("engineering", soc));
  add("counseling", kn("therapy", soc));
  add("safety", kn("safety", soc));
  add("hr", kn("hr", soc));
  add("marketing", kn("media", soc) != null ? avg(kn("media", soc), kn("sales", soc)) : null);
  add("documentation", avg(im("document", soc), kn("admin", soc)));
  add("operations", avg(kn("production", soc), kn("transport", soc), kn("admin2", soc)));
  add("lab", avg(kn("biology", soc), kn("chemistry", soc)));
  add("pm", avg(im("coord", soc), kn("admin2", soc)));
  add("dataviz", im("analyze", soc) != null ? im("analyze", soc) - .15 : null);
  const t = [...(tech[soc] || [])].join(" ");
  for (const [id, re] of Object.entries(TECH)) if (re.test(t)) cand.push([id, id === "excel" ? .56 : .7]);
  const best = {}; for (const [id, s] of cand) if (s != null && (best[id] == null || s > best[id])) best[id] = s;
  return Object.entries(best).filter(([, s]) => s >= .55).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
}

/* ---------------- text fields ---------------- */
const EDU_LEVEL = s => {
  if (!s) return null; s = String(s).toLowerCase();
  if (/doctoral|professional|master/.test(s)) return 3;
  if (/bachelor/.test(s)) return 2;
  if (/associate|postsecondary|some college/.test(s)) return 1;
  return 0;
};
const zoneEdu = z => z == null ? 1 : z <= 2 ? 0 : z === 3 ? 1 : z === 4 ? 2 : 3;
const easeOf = (edu, z) => (edu >= 3 || z >= 5) ? "Hard" : (edu === 2 || z >= 4) ? "Medium" : "Easy";
// 0.1 is the default for jobs with no known travel, so it counts as Rare.
const travelText = x => x <= .1 ? "Rare" : x < .3 ? "Some" : x < .6 ? "Regular" : "Frequent";
const wlbText = (h, p) => (h >= .6 || p >= .85) ? "Demanding" : (h >= .35 || p >= .7) ? "Mixed" : "Good";
const k = x => x == null ? null : Math.round(x);
const payPoint = (...ws) => { const v = ws.map(w => w.top ? TOP : w.k).filter(x => x != null); return v.length ? Math.round(mean(v)) : null; };
const fmtK = w => w.top ? `$${TOP}k+` : w.k == null ? "n/a" : `$${Math.round(w.k)}k`;
function titlesFor(soc) {
  const list = reportedTitles[soc] || [];
  const pick = [...list.filter(x => x.shown), ...list.filter(x => !x.shown)].map(x => x.t);
  return [...new Set(pick)].slice(0, 4).join(", ");
}
function stepText(soc, e) {
  const parts = [];
  if (e?.edu) parts.push(`Typical entry: ${e.edu.toLowerCase()}`);
  if (e?.exp && !/^none$/i.test(e.exp)) parts.push(`${e.exp.toLowerCase()} of experience in a related job`);
  if (e?.ojt && !/^none$/i.test(e.ojt)) parts.push(`then ${e.ojt.toLowerCase()}`);
  return parts.length ? parts.join("; ") + "." : "";
}

/* ---------------- subject areas (what the work is about) ----------------
   Matches the "What would you enjoy working with?" question in index.html (SUBJECTS).
   Most come from O*NET knowledge importance; a few have no O*NET measure and use job families. */
const SUBJ_RULES = {
  electric: ["47-2111", "47-2231", "49-2", "49-9051", "49-9052", "49-9097", "17-2071", "17-2072", "17-3023", "51-202"],
  animals: ["31-9096", "29-2056", "29-1131", "39-2011", "39-2021", "45-2093", "19-1023", "33-9011", "45-3031", "19-1011"],
  nature: ["45-", "37-3", "19-1013", "19-1031", "19-1032", "19-4071", "19-2041", "19-4042", "19-1029", "11-9013", "33-2022", "19-2043"],
  kids: ["25-2", "25-3021", "25-9042", "25-9043", "39-9011", "21-1021", "29-1221", "29-1243", "19-3034", "21-1012", "25-4022"],
  food: ["35-1011", "35-1012", "35-2", "51-301", "51-302", "51-309", "11-9051", "29-1031", "19-1012"],
  sports: ["27-2021", "27-2022", "27-2023", "39-9031", "29-9091", "29-1128", "39-3091"],
};
const SUBJ_KN = { // subject: [[knowledge key, weight], ...], start (importance 0–1 that counts as "some"), full
  machines: [[["mechanical", 1]], .5, .85], tech: [[["computers", 1]], .6, .9], build: [[["building", 1]], .5, .85],
  food: [[["food", 1]], .45, .8], health: [[["medicine", 1]], .5, .85], mind: [[["therapy", 1], ["psychology", .8]], .5, .85],
  money: [[["accounting", 1], ["math", .7]], .5, .85], law: [[["law", 1]], .55, .9], art: [[["fineArts", 1], ["design", .6]], .45, .85],
  media: [[["media", 1]], .5, .85], science: [[["biology", 1], ["chemistry", 1], ["physics", 1]], .55, .9],
  safety: [[["safety", 1]], .6, .9], transport: [[["transport", 1]], .5, .85], factory: [[["production", 1]], .55, .85],
  teach: [[["education", 1]], .6, .9],
};
function subjectsFor(soc) {
  const out = {};
  for (const [k, [parts, a, b]] of Object.entries(SUBJ_KN)) {
    const x = Math.max(0, ...parts.map(([kk, w]) => (kn(kk, soc) ?? 0) * w));
    const v = r2(clamp((x - a) / (b - a))); if (v >= .2) out[k] = v;
  }
  for (const [k, list] of Object.entries(SUBJ_RULES)) if (list.some(pre => soc.startsWith(pre))) out[k] = 1;
  return out;
}

/* ---------------- build ---------------- */
const handSocs = new Set(HAND.flatMap(h => h.soc || []));
const careers = [], skipped = [];
for (const soc of Object.keys(oews).sort()) {
  const o = oews[soc];
  const { raw, ints, gaps } = filled(soc);
  // "All Other" catch-alls (e.g. "Managers, All Other") aren't a job anyone can search for or aim at.
  if (/all other/i.test(o.title)) { skipped.push(`${soc} ${o.title}`); continue; }
  if (Object.values(ints).some(v => v == null)) { skipped.push(`${soc} ${o.title} (no interest data)`); continue; }
  const r = "RIASEC".split("").sort((a, b) => ints[b] - ints[a]).slice(0, 3).join("");
  const d = {};
  for (const t of TRAITS) { const x = raw[t]; if (x == null) continue; d[t] = r2(clamp(fit[t].a + fit[t].b * x)); if (!d[t]) delete d[t]; }
  const e = ep[soc];
  const z = jobZone[soc] != null ? Math.round(jobZone[soc]) : null;
  const edu = EDU_LEVEL(e?.edu) ?? zoneEdu(z);
  const physician = /^29-12[1-4]\d$/.test(soc);
  const pay = physician
    ? [payPoint(o.p.med), payPoint(o.p.med, o.p.p75), payPoint(o.p.p75, o.p.p90)]
    : [payPoint(o.p.p10, o.p.p25), payPoint(o.p.med), payPoint(o.p.p75, o.p.p90)];
  if (pay.some(x => x == null)) { skipped.push(`${soc} ${o.title} (incomplete wages)`); continue; }
  const onetCode = (onetCodes[soc] || []).find(c => c.endsWith(".00")) || (onetCodes[soc] || [])[0];
  careers.push({
    id: "b" + soc.replace("-", ""),
    n: o.title,
    r,
    // Full O*NET interest profile (R,I,A,S,E,C on 0–1), so careers that share a three-letter code still differ.
    ri: "RIASEC".split("").map(L => r2(clamp((ints[L] - 1) / 6))),
    pay, d,
    ease: easeOf(edu, z), ai: "Not rated yet", trv: travelText(d.tr || 0), wlb: wlbText(d.h || 0, d.p || 0), edu,
    start: "", end: "",
    titles: titlesFor(soc) || o.title,
    step: stepText(soc, e),
    sk: skillsFor(soc), ind: "", sub: subjectsFor(soc),
    desc: onetDesc[soc] || "",
    gen: 1, ...(gaps >= 6 ? { est: 1 } : {}),
    bls: {
      soc, title: o.title, year: OEWS_YEAR,
      pay: { p10: fmtK(o.p.p10), p25: fmtK(o.p.p25), med: fmtK(o.p.med), p75: fmtK(o.p.p75), p90: fmtK(o.p.p90) },
      emp: o.emp, growth: e?.growth ?? null, openings: e?.openings != null ? Math.round(e.openings * 1000) : null,
      edu: e?.edu || null, exp: e?.exp || null, ojt: e?.ojt || null,
      url: `https://www.bls.gov/oes/current/oes${soc.replace("-", "")}.htm`,
      onet: onetCode ? `https://www.onetonline.org/link/summary/${onetCode}` : null,
    },
  });
}
// Employment Projections report openings in thousands; growth is a percent.

/* ---------------- reviewed overrides ----------------
   A few fingerprint values that career research (careers-research.js, same id) showed are off,
   applied after the computed values so they survive the monthly rebuild. Keep each with its reason.
   Remove an entry if a later BLS/O*NET release fixes the underlying data. */
const OVERRIDES = {
  // Acupuncturists: OEWS leaves out the self-employed, who are most of the field, so its percentiles
  // overstate typical income. Research (2026-10-19): solo practices around $40–50k, one school's
  // graduates at a ~$27k median four years out. Use p10 / p25 / p75 instead of the usual points.
  "29-1291": { pay: [40, 55, 102] },
  // Oral and maxillofacial surgeons: the 10th/25th average (145) is dragged down by residents, teaching
  // and part-time posts; use the 25th percentile ($205k) for entry. Median and senior stay computed.
  "29-1022": { pay: o => [payPoint(o.p.p25), payPoint(o.p.med), payPoint(o.p.p75, o.p.p90)] },
  // Musical instrument repairers: many enter through 1–2 year repair programs (e.g. Minnesota State
  // College Southeast in Red Wing), so a postsecondary certificate is the more typical level.
  "49-9063": { edu: 1 },
  // Medical dosimetrists: since 2017 the MDCB certification exam requires a bachelor's degree plus a
  // 12-month accredited dosimetry program (often a post-bachelor's certificate), so it sits above
  // a plain bachelor's. Level 3 also makes ease "Hard".
  "29-2036": { edu: 3 },
  // Short-term substitute teachers: BLS lists a bachelor's, but only some states require one
  // (e.g. AZ, CA, IL); many accept some college credits, and Texas lets districts hire with a
  // high school diploma. Level 1 (some college / certificate) is the more typical bar.
  "25-3031": { edu: 1 },
  // Police sergeants and other first-line police supervisors: a promotion-only job. You first serve
  // about 4–5+ years as a patrol officer, then pass a promotional exam, so it is not an easy entry.
  "33-1012": { ease: "Hard" },
  // Detectives and criminal investigators: almost always promoted from patrol officer after several
  // years, so not an easy entry despite the high school education level.
  "33-3021": { ease: "Hard" },
  // Fire captains and lieutenants (first-line fire supervisors): promotion-only. You are hired as a
  // firefighter, serve several years (one 2026 lieutenant posting asks 5 years plus paramedic
  // certification), then pass a written exam and assessment center.
  "33-1021": { ease: "Hard" },
  // Security supervisors: most are promoted from security guard (some come from military or police),
  // so experience is needed, but the bar is lower than police or fire.
  "33-1091": { ease: "Medium" },
  // Entertainment and recreation supervisors: usually promoted from recreation worker or lifeguard;
  // BLS lists under 5 years of related experience.
  "39-1014": { ease: "Medium" },
  // --- From research batches of 2026-10-26 (PRs #40 and #41) ---
  // Commercial pilots: a commercial certificate needs 250+ flight hours, an FAA medical and tens of
  // thousands of dollars of flight training, so not an easy entry.
  "53-2012": { ease: "Hard" },
  // Correctional officer supervisors: promotion-only; years as a correctional officer, usually plus
  // a promotion exam.
  "33-1011": { ease: "Medium" },
  // Ship and boat captains, mates and pilots: a Coast Guard license takes years of documented sea time
  // (about 1,440 days for a towboat master) or a 4-year maritime academy degree.
  "53-5021": { ease: "Hard" },
  // Private detectives: BLS says entrants usually bring years of related experience, and most states
  // require a license.
  "33-9021": { ease: "Medium" },
  // Crane operators: OSHA requires certification by crane type plus an employer evaluation, and
  // employers want related experience.
  "53-7021": { ease: "Medium" },
  // Technical writers: O*NET's reported titles include Grant Writer and Requirements Analyst, which
  // are different jobs (Writers and Authors; business/systems analysts).
  "27-3042": { titles: "Technical Writer, Documentation Specialist, Engineering Writer, Information Developer" },
  // Taxi drivers: BLS counts rideshare drivers in this occupation, and they drive its projected growth.
  "53-3054": { titles: "Taxi Driver, Cab Driver, Rideshare Driver, Uber or Lyft Driver" },
  // Brokerage clerks: Sales Trader is a licensed trading role, not a clerk job.
  "43-4011": { titles: "Registered Sales Assistant, Sales Assistant, Trading Assistant, Brokerage Clerk" },
  // Title examiners: several states (for example Texas and Florida, per job postings) require a title
  // license, which the BLS entry line doesn't mention.
  "23-2093": { stepNote: "Some states require a title license, so check your state." },
  // Hands-on bench and factory work that O*NET's skill mapping missed or mislabeled.
  "51-9081": { sk: ["handson", "healthcare", "training", "pm", "teaching", "customer"] },
  "51-2011": { sk: ["handson", "training", "teaching"] },
  "51-2031": { sk: ["handson"] }, // engine assemblers: "customer" doesn't fit factory work
  // Floral designers: O*NET's "production" knowledge tags this as factory work; it is retail and
  // creative work, so use the art subject instead.
  "27-1023": { sub: { art: 0.7 } },
  // Work-life balance: journalists work odd hours (a 2025 survey: 83% work outside normal hours at
  // least weekly, 42% left a job over burnout); drafters and mechanical technicians mostly keep
  // standard full-time office hours.
  "27-3023": { wlb: "Demanding" },
  "17-3013": { wlb: "Mixed" },
  "17-3027": { wlb: "Mixed" },
  // --- From the research batch of 2026-10-26 (PR #43) ---
  // Locomotive engineers: must be 21+, need FRA certification, and nearly always work years as a
  // conductor first.
  "53-4011": { ease: "Medium", stepNote: "Most start as railroad conductors." },
  // Refinery operators: a process technology (PTEC) degree or plant or military experience is the
  // usual way in.
  "51-8093": { ease: "Medium" },
  // Sailors and marine oilers: entry needs a Coast Guard credential, a TSA TWIC card, drug and
  // medical tests, and STCW safety training.
  "53-5011": { ease: "Medium" },
  // Welding machine operators: Fabricator and Mig Welder are manual welding titles.
  "51-4122": { titles: "Robotic Welding Operator, Spot Welder, Welding Machine Operator, Machine Operator" },
  // Hands-on production work whose O*NET skill or subject mapping came up empty or off.
  "51-9195": { sk: ["handson", "safety", "training"], sub: { factory: 0.7 } }, // molders: lists were empty
  "51-5113": { sub: { factory: 0.7 } }, // print binders: subject list was empty
  "45-2093": { sk: ["handson", "safety", "training"] }, // animal farmworkers: only "training"
  "51-4193": { sk: ["handson", "safety", "training", "operations"] }, // plating: "engineering", "teaching" don't fit
  // Industrial designers work mostly in offices (BLS); design and art matter more than factory knowledge.
  "27-1021": { sub: { machines: 0.74, tech: 0.42, art: 0.6, factory: 0.3 } },
  // --- From the research batch of 2026-11-02 (PR #45) ---
  // Aircraft fuelers and deicers mostly work alone on the ramp: little people time or presenting.
  "53-6032": { d: { cu: 0.3, pr: 0.2 } },
  // About 40% of passenger attendants are school bus monitors, which involves little presenting.
  "53-6061": { d: { pr: 0.3 } },
  // Food cooking machine operators are tied to the line and its supervisors.
  "51-3093": { d: { au: 0.4 } },
  // Chip plants run 12-hour shifts around the clock.
  "51-9141": { d: { h: 0.7 } },
  // Early-intervention teachers often drive to family homes.
  "25-2051": { d: { tr: 0.2 } },
  // Funeral Director is a separate licensed job that needs mortuary school.
  "39-4021": { titles: "Funeral Assistant, Funeral Attendant, Funeral Home Assistant, Transfer Care Specialist" },
  // Industrial hygienists (including CIH) need a degree; this job's typical entry is high school.
  "19-5012": { titles: "Construction Safety Consultant, Industrial Hygiene Technician, Safety Specialist, Safety Technician" },
  "37-3012": { stepNote: "Most states require a pesticide applicator license (a core exam plus a category exam)." },
  "39-1013": { stepNote: "A state or tribal gaming license is required, and most supervisors first work 1–3 years as dealers." },
  // Power plant operators: aptitude tests and years of on-site training; nuclear operators need an NRC license.
  "51-8013": { ease: "Medium" },
  // --- From the research batch of 2026-11-03 (PR #47) ---
  // Air traffic controllers: chronic mandatory overtime; 30–35% of trainees do not finish the FAA Academy.
  "53-2021": { ease: "Hard", d: { h: 0.75 }, stepNote: "Applicants must be U.S. citizens, apply before age 31, pass the ATSA aptitude test, a medical exam and a security check, and finish the FAA Academy; controllers must retire at 56." },
  // Transportation inspectors: FRA and FAA postings say frequent or extensive travel.
  "53-6051": { d: { tr: 0.5 }, titles: "Aviation Safety Inspector, Marine Cargo Surveyor, Petroleum Inspector, Railroad Safety Inspector", stepNote: "Most inspectors first spend years in the industry they inspect; FAA aviation safety inspectors, for example, need pilot or mechanic certificates and long experience." },
  // Camera operators: mostly on location, often 12-hour-plus shoot days.
  "27-4031": { d: { tr: 0.5, h: 0.7 } },
  // Geoscientists: field camps and remote rotations.
  "19-2042": { d: { tr: 0.3 }, stepNote: "About 38 states license Professional Geologists (ASBOG exams), which is needed to sign public reports." },
  // Jewelers: bench work is the core of the job; skills were all retail.
  "51-9071": { d: { th: 0.85 }, sk: ["handson", "design", "customer", "sales"] },
  // Materials engineers split time across labs and plant floors.
  "17-2131": { d: { th: 0.45 } },
  // Religious activities directors: evenings, weekends, retreats.
  "21-2021": { d: { h: 0.6 } },
  // Ag graders: O*NET says 73% make repetitive motions almost constantly; Excel does not fit.
  "45-2041": { d: { v: 0.3 }, sk: ["handson", "safety"] },
  // Textile winding: repetitive machine tending.
  "51-6064": { d: { v: 0.3 } },
  // Conveyor operators: on-site line work with little presenting.
  "53-7011": { d: { pr: 0.1 } },
  // Morticians: licensed job.
  "39-4031": { ease: "Medium", stepNote: "Funeral directors need a state license: usually age 21, an accredited mortuary science program, a board exam, and a 1–3 year internship." },
  // Entry requirements found in the research (licenses, training, portfolio).
  "41-2012": { stepNote: "A state or tribal gaming license, a background check, and usually a drug test are required." },
  "51-9021": { stepNote: "Quarry and mine jobs require federal MSHA new-miner training (24 hours, 8 of them before starting)." },
  "19-1031": { stepNote: "Federal soil conservationist jobs require at least 30 semester hours in natural resource or agriculture courses, 12 of them in soils or plant science." },
  "17-2111": { stepNote: "A PE license (FE exam, experience, then PE exam) and the CSP certification are common for moving up." },
  "27-1022": { stepNote: "A portfolio is required, and most jobs are in New York and California." },
  // Bioengineers: Biomedical Technician is a different job (medical equipment repairer).
  "17-2031": { titles: "Biomedical Engineer, Process Engineer, Research Engineer" },
  // Broadcast announcers: jobs projected to fall 8%, with on-air cuts in 2026.
  "27-3011": { ease: "Hard" },
  // Broadcast technicians: engineering roles need RF and IP networking skills.
  "27-4012": { ease: "Medium" },
  // --- From the research batch of 2026-11-04 (PR #49) ---
  // Food roasting and baking operators: line work with little presenting or customer time.
  "51-3091": { d: { pr: 0.15, cu: 0.25 } },
  // Upholsterers: shop work with little presenting.
  "51-6093": { d: { pr: 0.15 } },
  // Lathe operators: machine work with little customer time or presenting.
  "51-4034": { d: { cu: 0.25, pr: 0.2 } },
  // Logging equipment operators: mostly solo machine time with a small crew.
  "45-4022": { d: { cu: 0.25 }, stepNote: "Logger safety training is often expected, and a commercial driver's license (CDL) helps." },
  // Tire builders: 12-hour rotating shifts and mandatory overtime; 'Tire Technician' usually means a shop tire changer.
  "51-9197": { d: { h: 0.7 }, titles: "Green Tire Builder, Retread Technician, Tire Builder, Tire Retreader" },
  // Special effects artists: BLS stresses programming skills; layoffs and studio closures make entry hard.
  "27-1014": { d: { c: 0.35 }, sk: ["design", "media", "programming"], ease: "Hard" },
  // Wellhead pumpers drive a route between wells all day.
  "53-7073": { d: { tr: 0.4 }, stepNote: "A valid driver's license and a good driving record are required." },
  // Petroleum engineers: rig visits and offshore rotations.
  "17-2171": { d: { tr: 0.35 } },
  // Middle school CTE teachers spend much of the day in shops, kitchens and labs.
  "25-2023": { d: { th: 0.45 } },
  // Zoologists and wildlife biologists: mostly field and lab research.
  "19-1023": { d: { cu: 0.45 } },
  "17-1012": { stepNote: "All 50 states require a license: the LARE exam plus supervised experience." },
  "19-4092": { stepNote: "A proficiency exam or lab approval may be needed before working cases alone, and some states license analysts." },
  // Bailiffs: many sheriff's offices require a peace officer license.
  "33-3011": { ease: "Medium", stepNote: "Many sheriff's offices require a peace officer license and law enforcement experience, plus a background check, polygraph and physical test." },
  "51-8091": { stepNote: "Employers often want 2–3 years of industrial or military experience or a process technology degree, plus a TWIC security card." },
  // Gas plant operators: years of on-site training; many postings ask for plant experience.
  "51-8092": { ease: "Medium", stepNote: "Employers often give aptitude tests, and most plants run rotating 12-hour day and night shifts." },
  "39-2011": { stepNote: "No state license is required; the optional CPDT-KA certification needs 300 hours of training experience plus an exam." },
  // Microbiologists: Clinical Laboratory Scientist belongs to clinical lab technologists (29-2011).
  "19-1022": { titles: "Bacteriologist, Microbiological Analyst, Microbiologist" },
  // --- From the research batch of 2026-11-05 (PR #51) ---
  // Calibration technicians: field calibration roles travel weekly.
  "17-3028": { d: { tr: 0.3 }, stepNote: "The ASQ Certified Calibration Technician (CCT) credential needs 3–5 years of experience." },
  // Umpires and referees: a different venue each game; irregular evenings, weekends and holidays.
  "27-2023": { d: { tr: 0.3 }, wlb: "Mixed" },
  // Soil and plant scientists: fieldwork (BLS).
  "19-1013": { d: { tr: 0.25 } },
  // Agricultural inspectors: farms, plants, ports, and emergency rotations.
  "45-2011": { d: { tr: 0.25 } },
  // Emergency management directors travel regularly to local agencies (BLS).
  "11-9161": { d: { tr: 0.25 } },
  // Sound engineering technicians: live, touring and location work.
  "27-4014": { d: { tr: 0.3 } },
  // Food scientists: some jobs travel to plants for production trials (BLS).
  "19-1012": { d: { tr: 0.25 } },
  // Fiberglass laminators: hand layup work; skill list did not fit.
  "51-2051": { d: { th: 0.9 }, sk: ["handson", "safety"], stepNote: "A respirator fit test is usually required." },
  // Locker room attendants: standing all shift, cleaning and lifting.
  "39-3093": { d: { th: 0.75 } },
  // Airfield operations: snow removal and heavy equipment.
  "53-2022": { d: { th: 0.7 }, stepNote: "A TSA background check is required, and many airports prefer an aviation degree." },
  // Food science technicians: sampling, swabbing, and the plant floor.
  "19-4013": { d: { th: 0.55 } },
  // Cleaning and pickling operators: repetitive machine tending.
  "51-9192": { d: { v: 0.4 } },
  // Furniture finishers: factory finishing work.
  "51-7021": { d: { v: 0.55 } },
  // Cartographers: Python in about a third of GIS postings.
  "17-1021": { d: { c: 0.3 } },
  // Barbers: about 80% are self-employed; state license required everywhere.
  "39-5011": { d: { en: 0.6 }, ease: "Medium", stepNote: "Every state requires a barber license, usually after 600–1,500+ hours of barber school and a state exam." },
  // Tailors: many run their own shops.
  "51-6052": { d: { en: 0.35 } },
  // Funeral home managers: licensed job.
  "11-9171": { ease: "Medium", stepNote: "Most states require a funeral director license: an accredited mortuary science program, a 1–3 year apprenticeship, and a board exam." },
  // Fire inspectors: certification plus years of fire service.
  "33-2021": { ease: "Medium", stepNote: "State certification (NFPA 1031 for inspectors, 1033 for investigators) is usually required." },
  // Postmasters: usually reached by promotion inside USPS.
  "11-9131": { ease: "Medium", stepNote: "Postmasters are usually promoted from inside the Postal Service, after work as a clerk, carrier or supervisor." },
  // Athletes: about 1% of college players are drafted by a major league.
  "27-2021": { ease: "Hard" },
  "23-1021": { stepNote: "A law license is required; federal administrative law judges must be licensed attorneys." },
  "43-3041": { stepNote: "Most states with casinos require a gaming license and background check." },
  // --- From the research batch of 2026-11-06 (PR #53) ---
  // Court reporters: about a third are freelancers who travel to depositions; school ends in 225 wpm tests.
  "27-3092": { d: { tr: 0.25 }, ease: "Medium", stepNote: "Many states require a license or certification (state CSR or NCRA); school usually takes 2–3 years and ends with speed tests of about 225 words per minute." },
  // Music directors: 58% work for religious organizations; BLS says only some travel.
  "27-2041": { d: { tr: 0.2 } },
  // Curators at large museums may travel a lot (BLS).
  "25-4012": { d: { tr: 0.2 } },
  // Environmental engineering technicians: remote field sites.
  "17-3025": { d: { tr: 0.25 }, stepNote: "OSHA HAZWOPER safety training is often required." },
  // Aerospace technicians: instrument setup, wiring and hardware tests.
  "17-3021": { d: { th: 0.65 }, stepNote: "Defense jobs may require a security clearance, which usually means U.S. citizenship." },
  // Adhesive bonding operators: machine tending with little presenting.
  "51-9191": { d: { pr: 0.15 } },
  // Auto damage appraisers: field inspections.
  "13-1032": { d: { th: 0.45 }, stepNote: "Many states license auto damage appraisers or adjusters, and employers usually want 3–5 years of collision estimating experience." },
  // Epidemiologists: statistical coding in R or SAS is routine.
  "19-1041": { d: { c: 0.3 } },
  "53-3011": { stepNote: "Employers usually require a clean driving record, often age 21+, an emergency vehicle operator course (EVOC), CPR, and a background check." },
  "13-1011": { stepNote: "Sports agents must register with each league's players union (the NFL, for example, requires a graduate degree or years of negotiating experience, a fee and an exam); California licenses talent agencies." },
  "53-4022": { stepNote: "Railroads require age 21+, a background check, and random drug and alcohol tests." },
  "25-4013": { stepNote: "Conservators usually need a 2–4 year master's in conservation, and only a handful of U.S. programs exist." },
  "33-9011": { stepNote: "Training and certification rules vary by state." },
  // Medical appliance technicians: Certified Orthotist and Prosthetist are clinician jobs.
  "51-9082": { titles: "Central Fabrication Technician, Orthotic Technician (Orthotic Tech), Prosthetic Technician (Prosthetic Tech)", stepNote: "ABC technician certification is optional: an accredited program, or a high school diploma plus 2 years of supervised bench work, then an exam." },
  // --- From the research batch of 2026-11-09 (PR #55) ---
  // Power dispatchers: several years of on-the-job training, and grid operators need NERC certification (BLS).
  "51-8012": { ease: "Medium", stepNote: "Operators whose work can affect the power grid must pass a NERC System Operator Certification exam." },
  // Loaders: barge tankermen need a Coast Guard credential, which this job's training level doesn't cover.
  "53-7121": { titles: "Loader Operator, Rail Car Loader, Tank Car Loader, Truck Loader" },
  // Forging operators: craft blacksmithing is a different job.
  "51-4022": { titles: "Forge Operator, Forge Press Operator, Hammer Operator, Process Technician (Process Tech)" },
  // Sports book writers and runners: "Casino Attendant" is much broader than this job.
  "39-3012": { titles: "Casino Floor Runner, Keno Runner, Racebook Writer, Sportsbook Writer" },
  // Textile cutting machine operators: skill list was empty.
  "51-6062": { sk: ["handson", "safety", "training"] },
  // --- From the research batch of 2026-11-09 (PR #57) ---
  // Ship engineers: Coast Guard credential plus years of sea time or a maritime academy degree (BLS).
  "53-5031": { ease: "Medium", titles: "Ferry Engineer, Port Engineer, Towboat Engineer, Tug Boat Engineer", stepNote: "A Coast Guard Merchant Mariner Credential with an engine endorsement and a TWIC card are required; most get there through a 4-year maritime academy or years at sea (an oiler needs at least 3 years to become third engineer)." },
  // Cooling and freezing operators: "Refrigeration Technician" usually means HVAC/R techs, a different job.
  "51-9193": { titles: "Certified Refrigeration Operator, Freezer Operator, Freezer Person, Refrigeration Operator" },
  // Traffic technicians: BLS's job is traffic studies; signal work is electrical and needs IMSA certification.
  "53-6041": { titles: "Traffic Control Technician (Traffic Control Tech), Traffic Signal Technician (TST), Traffic Survey Technician (Traffic Survey Tech), Transportation Technician (Transportation Tech)", stepNote: "Traffic signal jobs usually also want electronics training and IMSA certification." },
  // Geological technicians: O*NET Job Zone 4; oil and gas postings often want a geology degree.
  "19-4043": { stepNote: "Many postings, especially in oil and gas, prefer a bachelor's in geology or a related science." },
  // Archivists: a registrar is a related but different museum job.
  "25-4011": { titles: "Archivist, Digital Archivist, Records Manager, State Archivist" },
};
for (const c of careers) {
  const ov = OVERRIDES[c.bls.soc];
  if (!ov) continue;
  if (ov.pay) c.pay = typeof ov.pay === "function" ? ov.pay(oews[c.bls.soc]) : ov.pay;
  if (ov.edu != null) { c.edu = ov.edu; c.ease = easeOf(ov.edu, jobZone[c.bls.soc] != null ? Math.round(jobZone[c.bls.soc]) : null); }
  if (ov.ease) c.ease = ov.ease;
  if (ov.wlb) c.wlb = ov.wlb;
  if (ov.titles) c.titles = ov.titles;
  if (ov.sk) c.sk = ov.sk;
  if (ov.sub) c.sub = ov.sub;
  if (ov.d) { // work-style levels: merge, then refresh the travel and work-life labels built from them
    c.d = { ...c.d, ...ov.d };
    c.trv = travelText(c.d.tr || 0);
    if (!ov.wlb) c.wlb = wlbText(c.d.h || 0, c.d.p || 0);
  }
  if (ov.stepNote) c.step = (c.step ? c.step + " " : "") + ov.stepNote;
  log(`- override ${c.bls.soc} ${c.n}: ${JSON.stringify({ pay: c.pay, edu: c.edu, ease: c.ease, ...(ov.wlb ? { wlb: c.wlb } : {}), ...(ov.titles ? { titles: c.titles } : {}), ...(ov.sk ? { sk: c.sk } : {}), ...(ov.sub ? { sub: c.sub } : {}), ...(ov.d ? { d: ov.d, trv: c.trv, wlb: c.wlb } : {}), ...(ov.stepNote ? { step: c.step } : {}) })}`);
}

/* ---------------- write ---------------- */
const header = `/* Generated by tools/build-careers.mjs — do not edit by hand.
   ${careers.length} U.S. occupations from BLS OEWS (${OEWS_YEAR}) wages${Object.keys(ep).length ? ", BLS Employment Projections" : ""},
   and O*NET (${ONET_VERSION}) job data. O*NET is a trademark of the U.S. Department of Labor; its data is used under CC BY 4.0.
   Fingerprints are computed, not hand-checked. See tools/build-report.md. */
"use strict";
const CAREERS_BLS=[
`;
fs.writeFileSync(path.join(ROOT, "careers-bls.js"), header + careers.map(c => " " + JSON.stringify(c)).join(",\n") + "\n];\n");

log(`\n## Result\n- ${careers.length} careers written to careers-bls.js`);
log(`- ${careers.filter(c => handSocs.has(c.bls.soc)).length} of them fold into hand-tuned careers (same SOC code)`);
log(`- ${careers.filter(c => c.est).length} have thin O*NET data, so much of their fingerprint is estimated from similar jobs (marked est)`);
log(`- ${skipped.length} occupations skipped ("All Other" catch-all groups, or incomplete wages)`);
if (skipped.length) log("\n<details><summary>Skipped occupations</summary>\n\n" + skipped.map(s => "- " + s).join("\n") + "\n</details>");
const top = [...careers].sort((a, b) => b.pay[1] - a.pay[1]).slice(0, 15);
log("\n## Highest median pay (spot check)\n" + top.map(c => `- ${c.n}: median ${c.bls.pay.med}, code ${c.r}, edu ${c.edu}`).join("\n"));
fs.writeFileSync(path.join(ROOT, "tools", "build-report.md"),
  `# Career data build report\n\nBuilt from OEWS ${OEWS_YEAR} and O*NET ${ONET_VERSION}.\n\n` + report.join("\n") + "\n");
