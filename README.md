# AgentRadar

**One contract, one project.** A free-mint radar, pay by `.ai` name, and 3-person squads — all gated by Agent ID on BNB Chain.

Built by **vanmuse.ai** (`0xE65dCfef94a76239733177A04e9a5Bf37CE3AFa7`) for the **Agent ID Hackathon** (Binance Wallet x BNB Chain). Submissions: 18 Nov 2026 08:00 UTC – 9 Dec 2026 08:00 UTC.

> Not a Binance product and not affiliated with Binance. The project name does not use "Binance"/"BNB".

## Pitch

Agent ID is the on-chain name (`.ai`) of an Agentic Wallet — but today it is barely used inside any product. AgentRadar turns it into a **gate and identity that is actually used**:

1. **Radar** — Agent ID holders check in daily on-chain (once per UTC day), with a consecutive-day streak recorded, plus a list of free mints that passed DYOR. A real reason to come back every day.
2. **Pay by Name** — send BNB by typing `alice.ai` instead of a long `0x…` address. Names are registered by their owners themselves (opt-in), 100% of the funds are forwarded in the same transaction, with no fee and no custody.
3. **Squad** — teams of 3 Agent IDs (modelled on PodMint collab teams): create/join a squad, record wins/losses and points on-chain. Team reputation that cannot run away mid-round.

One contract = one contract address for the judges to count (interacting Agent ID addresses, volume, transaction count), and one project submission, per the rule "each team may submit one project only".

## How Agent ID is used here

- **Gate:** every state-changing function requires `balanceOf` > 0 on the Agent ID contract (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, ERC-721 SPACE ID Agent ID, non-transferable). The check happens on-chain on every call.
- **Identity:** `registerName` maps a `.ai` name to its owner's address — only the owner can register their own name, one name per address, changeable (the old name is freed). This is **not** a tool for looking up other people's wallets by name: a name can only be resolved if its owner opted in to publish it.
- **Squad:** membership and results are recorded per holder address.

## Contract

`contracts/AgentRadar.sol` — **one file, Solidity ^0.8.24, SPDX MIT, NO imports** (BscScan verification is a single-file paste). Compiled with `evmVersion: "paris"` (solc 0.8.28 defaults to Cancun, which uses PUSH0; Paris is the safe target for BNB Chain and local test chains).

| Function | Description |
|---|---|
| `checkIn()` | Once per UTC day, holder only. Streak increases if you also checked in yesterday, resets if you miss a day. |
| `registerName(string)` | 3–32 characters, only `a-z 0-9 . -` (uppercase rejected). Unique, 1 name/address. |
| `resolveName(string)` / `getName(address)` | Views. |
| `payByName(string)` payable | Forwards **100%** of `msg.value` to the name's owner. Rejects: unregistered name, paying yourself, zero value. |
| `createSquad(string)` / `joinSquad(id)` / `leaveSquad()` | Max 3 members/squad, 1 squad/address. |
| `recordSquadResult(id, won, points)` | Only a member of that squad. Updates wins/losses/points. |
| `isAgentIdHolder(address)` / `getStreak(address)` / `getSquad(id)` | Views. |

**Owner = deployer, and there is NO pause / mint / tax / withdraw / fee / approval / custody function.** `receive()` and `fallback()` deliberately revert — the contract never holds user funds. The only "owner power" is that there is none.

## Test status (local, 18 Nov 2026)

- **Compile: PASS.** `node test/compile-test.mjs` — 14/14 required functions present in the ABI, 0 errors. Bytecode **6,844 bytes** (solc 0.8.28, optimizer 200 runs, evmVersion paris).
- **Local deploy test: PASS, 27/27 checks** (`node test/local-deploy-test.mjs`, in-process ganache + mock Agent ID):
  check-in & streak (including reset after a missed day), non-holder rejected, double check-in in one day rejected, name registration (uppercase, too short, taken name, non-holder rejected), re-registering frees the old name, payByName forwards the full 0.01 ETH, unknown name / self-pay / zero value rejected, direct ETH transfers rejected, squad (max 3, 1 squad/address, result recording, non-member rejected, leaving).
- **Measured deploy gas (local): 1,502,066 gas** → ±0.0000751 BNB at 0.05 gwei, ±0.0001502 BNB at 0.1 gwei. Well below the deployer wallet balance (±0.000509 BNB). Mainnet gas may differ slightly; re-measure at deploy preview.
- Two lessons recorded in the tests: (1) solc's Cancun default fails on older chains because of PUSH0 — hence `evmVersion: "paris"`; (2) ethers v6 caches the block number, so balance tests use raw JSON-RPC (`eth_getBalance`) — see the comments in `test/local-deploy-test.mjs`.

**Deployed ✅ 18 Nov 2026:** contract `0x7c4686636e03fc055b588c1e0f6753048Cd56Cd2` on BSC, deploy tx `0xf38a1a0531254ca585ac39bad957e4ad66b64c00ce260479f5bfb446ec905b26` (block 134,238,782, gas used 1,490,802 @ 0.09 gwei ≈ 0.000134 BNB, deployer `0x73dbA5Ea5432283B8F508F4d3b55161F0D575d55`). Live checks: `agentIdContract()` = `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, `isAgentIdHolder(vanmuse.ai)` = true, deployer = false, totals 0. **Sourcify verification ✅ Exact Match (runtime + creation), 18 Nov 2026 ~18:52 WIB, job 942e385a-2a22-45f5-b718-962172e573f1, match 59466614.** **BscScan verification ✅ Pass - Verified, 18 Nov 2026 ~19:00 WIB, via Etherscan V2 API** (`verifysourcecode`, chainid 56, GUID ci5sxjeniy4kjscufiud6svxakp43rfdd7zcggjptkafcxjkch; the V2 API requires `codeformat=solidity-single-file`). **Public repo ✅ https://github.com/vanmuse/agent-radar, website live ✅ https://vanmuse.github.io/agent-radar/.** **NOT done yet:** project submission form, 30 interacting addresses, X post — see the Checklist below.

## Run locally

```bash
cd agentid-hackathon
npm install            # solc + ethers + ganache (local dev/test only)
node test/compile-test.mjs        # compile + ABI check
node test/local-deploy-test.mjs   # local deploy + 27 checks

# Frontend (static, no build step):
python3 -m http.server 8080
# open http://localhost:8080/web/
```

Note: the frontend loads `../data/mints.json`, so it must be served over an http server from the project root (not `file://`, and not only from the `web/` folder).

## Deploy + BscScan verification (after the user agrees)

1. Prepare the deployer wallet `vanmuse.ai` with enough BNB (±0.0002 BNB is more than enough for deployment at normal gas — re-measure at preview).
2. Deploy `contracts/AgentRadar.sol` with the constructor argument = the Agent ID contract address `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`. **Do not deploy from an automated script** — build a transaction preview, show it to the user, and run it only after explicit OK.
3. Verify the source on BscScan: single file, compiler 0.8.28, optimizer enabled 200 runs, evmVersion paris, MIT license.
4. Fill the contract address into `web/app.js` (`CONTRACT_ADDRESS`), replace the `TBD` in this file, commit + push to GitHub (public repo, open-source — a hackathon requirement).
5. Test live in the frontend: connect wallet → holder status → check-in → register name → small payment → create squad. Every transaction is confirmed manually in the wallet.
6. Submit: project name, website, contract address, Agent ID usage description — within the submission period (until 9 Dec 2026 08:00 UTC).

## Hackathon safety / red-line compliance

- ❌ No QR login / pairing codes on the web. Login = a normal wallet connect (injected `window.ethereum`).
- ❌ No bypassing transaction confirmation. Every state-changing call shows a wallet confirmation popup; no auto-sign.
- ❌ No automatic / scheduled / bundled transfers. `payByName` only runs when the user sends it themselves.
- ❌ No unlimited approvals. The contract never asks for any token approval.
- ✅ Contract open-source, 1 file, no imports; no owner power over user funds (see the table above).
- ❌ Project/token/domain names do not use "Binance"/"BNB".
- ❌ No collection of seed phrases / private keys / API secrets / pairing codes — there is not a single field for them.
- ❌ No "passive income" / "automatic money-making" promises. There is no yield of any kind in this product.
- ⚠️ Trading pages: this product is not a trading page, but the risk warning still shows at the top of the frontend, plus a DYOR + check Sourcify/BscScan warning on every mint listing.
- ✅ Pay by Name is not a tool to look up other people's wallets: names are only registered by their owners themselves (opt-in).

## Plan for 30 addresses (Innovation Award requirement)

At least 30 different Agent ID addresses must interact with the contract during the submission period. Plan: promote the daily check-in + squads to the Boltbook community (lobby/collab) and X @vanmuse; every squad member = 1 address; the streak leaderboard gives a reason to return daily. Progress is counted from on-chain events (`CheckIn`, `NameRegistered`, `Paid`, `SquadCreated`), not from claims.

## Submission checklist

- [x] Contract written, compiled, tested locally (27/27)
- [x] Static frontend finished (3 tabs + risk warning), UI in English
- [x] `data/mints.json` examples (5 real mints, labelled as examples)
- [x] X thread draft (`promo/X-thread.md`) — NOT posted yet
- [x] Deploy to BSC — `0x7c4686636e03fc055b588c1e0f6753048Cd56Cd2`, tx `0xf38a1a0531254ca585ac39bad957e4ad66b64c00ce260479f5bfb446ec905b26`
- [x] Sourcify verification — Exact Match (runtime + creation)
- [x] BscScan verification — Pass - Verified via Etherscan V2 API (GUID ci5sxjeniy4kjscufiud6svxakp43rfdd7zcggjptkafcxjkch)
- [x] Public GitHub repo — https://github.com/vanmuse/agent-radar; website live at https://vanmuse.github.io/agent-radar/
- [x] Fill the contract address into `web/app.js` + README
- [ ] Reach 30 Agent ID addresses (Boltbook + X promotion)
- [ ] Submit the project (hackathon form) before 9 Dec 2026 08:00 UTC
- [ ] Submit the X thread link to the Promotion Award survey

## Structure

```
agentid-hackathon/
├── contracts/AgentRadar.sol   # contract (1 file, no imports)
├── scripts/compile.mjs        # compile with solc-js -> build/AgentRadar.json
├── build/AgentRadar.json       # ABI + bytecode from compilation
├── test/
│   ├── compile-test.mjs       # compile + ABI check
│   ├── local-deploy-test.mjs  # ganache deploy + 27 checks
│   └── MockAgentID.sol        # mock for TESTS ONLY (not part of the submission)
├── web/                       # static frontend (index.html, app.js, style.css)
├── data/mints.json             # example free mints (labelled as examples, verify live)
├── promo/X-thread.md           # X thread draft (not posted)
├── SUBMISSION.md               # submission pack (fields + BscScan params)
└── README.md
```

## License

MIT.
