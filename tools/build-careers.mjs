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
  oews[code] = { title: String(col(row, /^OCC_TITLE$/i)).trim(), emp: num(col(row, /^TOT_EMP$/i)), p };
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
const travelText = x => x < .1 ? "Rare" : x < .3 ? "Some" : x < .6 ? "Regular" : "Frequent";
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

/* ---------------- build ---------------- */
const handSocs = new Set(HAND.flatMap(h => h.soc || []));
const careers = [], skipped = [];
for (const soc of Object.keys(oews).sort()) {
  const o = oews[soc];
  const { raw, ints, gaps } = filled(soc);
  // "All Other" catch-alls without their own O*NET profile are too vague to fingerprint.
  if (/all other/i.test(o.title) && (INT[soc].R == null || RAW[soc].v == null)) { skipped.push(`${soc} ${o.title}`); continue; }
  if (Object.values(ints).some(v => v == null)) { skipped.push(`${soc} ${o.title} (no interest data)`); continue; }
  const r = "RIASEC".split("").sort((a, b) => ints[b] - ints[a]).slice(0, 3).join("");
  const d = {};
  for (const t of TRAITS) { const x = raw[t]; if (x == null) continue; d[t] = r2(clamp(fit[t].a + fit[t].b * x)); if (!d[t]) delete d[t]; }
  const e = ep[soc];
  const z = jobZone[soc] != null ? Math.round(jobZone[soc]) : null;
  const edu = EDU_LEVEL(e?.edu) ?? zoneEdu(z);
  const pay = [payPoint(o.p.p10, o.p.p25), payPoint(o.p.med), payPoint(o.p.p75, o.p.p90)];
  if (pay.some(x => x == null)) { skipped.push(`${soc} ${o.title} (incomplete wages)`); continue; }
  const onetCode = (onetCodes[soc] || []).find(c => c.endsWith(".00")) || (onetCodes[soc] || [])[0];
  careers.push({
    id: "b" + soc.replace("-", ""),
    n: o.title,
    r, pay, d,
    ease: easeOf(edu, z), ai: "Not rated yet", trv: travelText(d.tr || 0), wlb: wlbText(d.h || 0, d.p || 0), edu,
    start: "", end: "",
    titles: titlesFor(soc) || o.title,
    step: stepText(soc, e),
    sk: skillsFor(soc), ind: "",
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
log(`- ${skipped.length} occupations skipped (vague "All Other" groups without their own data, or incomplete wages)`);
if (skipped.length) log("\n<details><summary>Skipped occupations</summary>\n\n" + skipped.map(s => "- " + s).join("\n") + "\n</details>");
const top = [...careers].sort((a, b) => b.pay[1] - a.pay[1]).slice(0, 15);
log("\n## Highest median pay (spot check)\n" + top.map(c => `- ${c.n}: median ${c.bls.pay.med}, code ${c.r}, edu ${c.edu}`).join("\n"));
fs.writeFileSync(path.join(ROOT, "tools", "build-report.md"),
  `# Career data build report\n\nBuilt ${new Date().toISOString().slice(0, 10)} from OEWS ${OEWS_YEAR} and O*NET ${ONET_VERSION}.\n\n` + report.join("\n") + "\n");
