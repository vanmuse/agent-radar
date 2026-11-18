// Local EVM deploy test (ganache in-process, no real chain, no real wallet).
// Deploys MockAgentID + AgentRadar, then exercises every module.
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import Ganache from "ganache";
import { ethers } from "ethers";

const root = path.resolve(import.meta.dirname, "..");
const server = Ganache.server({
  wallet: { mnemonic: "test test test test test test test test test test test junk" },
  logging: { quiet: true },
});
await server.listen(8545);
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const [deployer, alice, bob, carol, dave] = await Promise.all(
  [0, 1, 2, 3, 4].map((i) => provider.getSigner(i))
);
// NOTE: ethers v6 JsonRpcProvider caches the "current" block number and only
// refreshes it via its polling loop, so getBalance()/getBlockNumber() can stay
// pinned at block 0 in a script with no subscriptions. Raw JSON-RPC reads
// bypass that cache and always see the latest state.
const rpcUrl = "http://127.0.0.1:8545";
async function rawBalance(addr) {
  const r = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"] }),
  });
  return BigInt((await r.json()).result);
}
const addrs = await Promise.all([deployer, alice, bob, carol, dave].map((s) => s.getAddress()));

function compileAll() {
  const sources = {};
  for (const f of ["contracts/AgentRadar.sol", "test/MockAgentID.sol"]) {
    sources[path.basename(f)] = { content: fs.readFileSync(path.join(root, f), "utf8") };
  }
  const input = {
    language: "Solidity",
    sources,
    settings: { evmVersion: "paris", optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (out.errors || []).filter((e) => e.severity === "error");
  if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
  return out.contracts;
}

const contracts = compileAll();
const mockC = contracts["MockAgentID.sol"]["MockAgentID"];
const radarC = contracts["AgentRadar.sol"]["AgentRadar"];

const Mock = new ethers.ContractFactory(mockC.abi, "0x" + mockC.evm.bytecode.object, deployer);
const mock = await Mock.deploy();
await mock.waitForDeployment();
const mockAddr = await mock.getAddress();

// Holders: deployer, alice, bob, carol. Dave is NOT a holder.
for (const a of [addrs[0], addrs[1], addrs[2], addrs[3]]) {
  await (await mock.setBalance(a, 1)).wait();
}
console.log("mock AgentID at", mockAddr, "| holder check deployer:", await mock.balanceOf(addrs[0]), "| dave:", await mock.balanceOf(addrs[4]));

const Radar = new ethers.ContractFactory(radarC.abi, "0x" + radarC.evm.bytecode.object, deployer);
const radar = await Radar.deploy(mockAddr);
const receipt = await radar.waitForDeployment();
const deployReceipt = await provider.getTransactionReceipt((await radar.deploymentTransaction()).hash);
console.log("AgentRadar deployed at", await radar.getAddress(), "| deploy gas used:", deployReceipt.gasUsed.toString());

let pass = 0;
const check = (name, cond) => { if (!cond) throw new Error("FAIL: " + name); pass++; console.log("ok -", name); };
// A tx "reverts" either by failing at send time (gas estimation) or by
// mining with status 0 — both must count as a revert. Merely getting a tx
// hash back is NOT success.
const reverts = async (name, promise) => {
  try {
    const tx = await promise;
    const rc = await tx.wait();
    if (rc.status === 1) throw new Error("expected revert, got success");
  } catch (e) {
    if (e.message.includes("expected revert")) throw e;
  }
  pass++;
  console.log("ok -", name, "(reverted as expected)");
};

// --- Radar check-in ---
await reverts("non-holder checkIn reverts", radar.connect(dave).checkIn());
await (await radar.connect(alice).checkIn()).wait();
let s = await radar.getStreak(addrs[1]);
check("alice streak=1, total=1", s[0] === 1n && s[1] === 1n);
check("totalCheckIns=1", (await radar.totalCheckIns()) === 1n);
await reverts("second check-in same UTC day reverts", radar.connect(alice).checkIn());
// next day: advance 1 day, streak becomes 2
await provider.send("evm_increaseTime", [86400]);
await provider.send("evm_mine", []);
await (await radar.connect(alice).checkIn()).wait();
s = await radar.getStreak(addrs[1]);
check("alice streak=2 after consecutive day", s[0] === 2n);
// skip a day: streak resets to 1
await provider.send("evm_increaseTime", [2 * 86400]);
await provider.send("evm_mine", []);
await (await radar.connect(alice).checkIn()).wait();
s = await radar.getStreak(addrs[1]);
check("alice streak resets to 1 after a missed day", s[0] === 1n && s[1] === 3n);

// --- Pay by Name ---
await reverts("registerName rejects uppercase", radar.connect(alice).registerName("Alice.AI"));
await reverts("registerName rejects too short", radar.connect(alice).registerName("ab"));
await reverts("non-holder registerName reverts", radar.connect(dave).registerName("dave.ai"));
await (await radar.connect(alice).registerName("alice.ai")).wait();
check("resolveName alice.ai -> alice", (await radar.resolveName("alice.ai")) === addrs[1]);
check("getName alice -> alice.ai", (await radar.getName(addrs[1])) === "alice.ai");
await reverts("second holder cannot take taken name", radar.connect(bob).registerName("alice.ai"));
await (await radar.connect(alice).registerName("alice2.ai")).wait();
check("re-register frees old name", (await radar.resolveName("alice.ai")) === ethers.ZeroAddress);
check("new name resolves", (await radar.resolveName("alice2.ai")) === addrs[1]);

const balBefore = await rawBalance(addrs[1]);
await (await radar.connect(bob).payByName("alice2.ai", { value: ethers.parseEther("0.01") })).wait();
const balAfter = await rawBalance(addrs[1]);
check("payByName forwards full 0.01 ETH", balAfter - balBefore === ethers.parseEther("0.01"));
await reverts("payByName unknown name reverts", radar.connect(bob).payByName("nobody.ai", { value: 100n }));
await reverts("payByName self-pay reverts", radar.connect(alice).payByName("alice2.ai", { value: 100n }));
await reverts("payByName zero value reverts", radar.connect(bob).payByName("alice2.ai", { value: 0n }));
await reverts("plain ETH transfer to contract reverts", deployer.sendTransaction({ to: await radar.getAddress(), value: 100n }));

// --- Squad ---
await reverts("non-holder createSquad reverts", radar.connect(dave).createSquad("team-x"));
const tx = await radar.connect(alice).createSquad("pod-squad");
const rc = await tx.wait();
const created = rc.logs.map((l) => { try { return radar.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "SquadCreated");
const squadId = created.args[0];
check("squad id = 1", squadId === 1n);
await (await radar.connect(bob).joinSquad(squadId)).wait();
await (await radar.connect(carol).joinSquad(squadId)).wait();
await reverts("4th member rejected (max 3)", radar.connect(deployer).joinSquad(squadId));
await reverts("member cannot join second squad", radar.connect(bob).joinSquad(squadId));
await (await radar.connect(alice).recordSquadResult(squadId, true, 10)).wait();
await (await radar.connect(bob).recordSquadResult(squadId, false, 5)).wait();
const sq = await radar.getSquad(squadId);
check("squad wins=1 losses=1 points=15 members=3", sq[4] === 1n && sq[5] === 1n && sq[6] === 15n && sq[3].length === 3);
await reverts("non-member cannot record result", radar.connect(deployer).recordSquadResult(squadId, true, 1));
await (await radar.connect(carol).leaveSquad()).wait();
check("carol left squad, memberSquad=0", (await radar.memberSquad(addrs[3])) === 0n);
check("totalSquads=1", (await radar.totalSquads()) === 1n);

console.log(`\nLOCAL DEPLOY TEST PASS: ${pass} checks, deploy gas ${deployReceipt.gasUsed}`);
await server.close();
process.exit(0);
