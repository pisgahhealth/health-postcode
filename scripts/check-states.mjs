import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const USAGE = "usage: NIPOST_API_KEY=<key> NIPOST_STATES_URL=<list-states url> node scripts/check-states.mjs";
const CODE_KEYS = ["code", "state_code", "abbreviation"];
const NAME_KEYS = ["name", "state_name", "state"];

const apiKey = process.env.NIPOST_API_KEY;
const statesUrl = process.env.NIPOST_STATES_URL;
if (!apiKey || !statesUrl) {
  console.error(USAGE);
  process.exit(2);
}

// Exit codes follow diff(1): 0 same, 1 different, 2 trouble.
try {
  const ours = await loadStateNames();
  const theirs = await fetchNipostStates(statesUrl, apiKey);
  process.exit(report(ours, theirs) ? 1 : 0);
} catch (error) {
  console.error(`check-states: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

async function loadStateNames() {
  const dist = new URL("../dist/index.js", import.meta.url);
  if (existsSync(dist)) {
    console.error("check-states: comparing against STATE_NAMES from dist/index.js (run npm run build if src changed)");
    return { ...(await import(dist.href)).STATE_NAMES };
  }
  console.error("check-states: comparing against STATE_NAMES parsed from src/states.ts");
  const source = await readFile(new URL("../src/states.ts", import.meta.url), "utf8");
  const block = /STATE_NAMES[^=]*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/.exec(source);
  if (!block) throw new Error("could not find STATE_NAMES in src/states.ts");
  const names = {};
  for (const [, code, name] of block[1].matchAll(/([A-Z]{2}):\s*"([^"]*)"/g)) names[code] = name;
  return names;
}

async function fetchNipostStates(url, key) {
  const response = await fetch(url, {
    headers: { "x-api-key": key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  const body = await response.json();
  const list = Array.isArray(body) ? body : [body?.data, body?.states, body?.results].find(Array.isArray);
  if (!list) throw new Error("expected a JSON array of states (or one under data, states or results)");
  const names = {};
  list.forEach((entry, i) => {
    const code = pick(entry, CODE_KEYS);
    const name = pick(entry, NAME_KEYS);
    if (typeof code !== "string" || !/^[A-Za-z]{2}$/.test(code.trim()) || typeof name !== "string") {
      throw new Error(`entry ${i} has no two-letter code or no name: ${JSON.stringify(entry)}`);
    }
    names[code.trim().toUpperCase()] = name.trim();
  });
  return names;
}

function pick(entry, keys) {
  if (typeof entry !== "object" || entry === null) return undefined;
  return keys.map((k) => entry[k]).find((v) => typeof v === "string" && v.trim() !== "");
}

function report(ours, theirs) {
  const same = (a, b) => a.replace(/\s+/g, " ").toLowerCase() === b.replace(/\s+/g, " ").toLowerCase();
  const missing = Object.keys(theirs).filter((c) => !(c in ours)).sort();
  const extra = Object.keys(ours).filter((c) => !(c in theirs)).sort();
  const renamed = Object.keys(ours).filter((c) => c in theirs && !same(ours[c], theirs[c])).sort();
  for (const c of missing) console.log(`missing from STATE_NAMES: ${c} "${theirs[c]}"`);
  for (const c of extra) console.log(`not in NIPOST's list: ${c} "${ours[c]}"`);
  for (const c of renamed) console.log(`name differs: ${c} STATE_NAMES "${ours[c]}", NIPOST "${theirs[c]}"`);
  const differences = missing.length + extra.length + renamed.length;
  console.log(differences === 0 ? `no differences across ${Object.keys(ours).length} codes` : `${differences} difference(s)`);
  return differences > 0;
}
