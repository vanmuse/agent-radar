// Compile test: compiles contracts/AgentRadar.sol with solc-js and asserts
// the ABI contains every required function. No chain, no wallet, no signing.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
execSync("node scripts/compile.mjs", { cwd: root, stdio: "inherit" });

const built = JSON.parse(fs.readFileSync(path.join(root, "build", "AgentRadar.json"), "utf8"));
const fns = new Set(built.abi.filter((x) => x.type === "function").map((x) => x.name));
const required = [
  "checkIn",
  "registerName",
  "payByName",
  "createSquad",
  "joinSquad",
  "leaveSquad",
  "recordSquadResult",
  "resolveName",
  "getName",
  "isAgentIdHolder",
  "getStreak",
  "getSquad",
  "totalCheckIns",
  "totalSquads",
];
for (const fn of required) assert(fns.has(fn), `missing ABI function: ${fn}`);
assert(built.bytecode.startsWith("0x") && built.bytecode.length > 100, "bytecode looks empty");
assert(!built.bytecode.slice(2).includes("0x"), "bytecode malformed");
// No imports: source must not contain an import statement.
const src = fs.readFileSync(path.join(root, "contracts", "AgentRadar.sol"), "utf8");
assert(!/^\s*import\s/m.test(src), "contract must have no imports");
assert(src.includes("0.8.24"), "pragma should be ^0.8.24");
console.log(`COMPILE TEST PASS: ${required.length}/${required.length} required functions present, bytecode ${(built.bytecode.length - 2) / 2} bytes`);
