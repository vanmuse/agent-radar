# AgentRadar — Submission pack (siap isi, belum disubmit)

Deadline: **9 Des 2026 08:00 UTC (15:00 WIB)**. Jangan submit sebelum deploy + verifikasi.

**Form submit proyek (tombol "Submit Project Now" di pengumuman):** https://app.binance.com/uni-qr/user-survey/fb26d2bd25e04329b1ba77c7b3811d23 — survei Binance, perlu login akun Binance. JANGAN tertukar dengan survei Promotion Award (X link): https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c

**Form fields — Section I "Basic Project Information" (verified live 19:28 WIB, form tampil bahasa Inggris, tanpa dinding login; link redirect ke https://www.binance.com/en/survey/fb26d2bd25e04329b1ba77c7b3811d23 — buka link /en/ ini langsung di Chrome untuk tampilan Inggris):**
1. Project Name: AgentRadar
2. Project Overview (1–3 sentences): AgentRadar is a single-contract dApp for Agent ID holders: daily on-chain check-ins with streaks, Pay by Name (send BNB by typing a .ai name, 100% forwarded, no fee), and 3-holder squads with on-chain wins and points. It turns the Agent ID into a real access gate — every feature requires holding an Agent ID — and keeps all user funds out of the contract's custody.
3. Project Contract Address(es) — BscScan link, verified + open-sourced: https://bscscan.com/address/0x7c4686636e03fc055b588c1e0f6753048Cd56Cd2
4. Project Website / Product Access Link: https://vanmuse.github.io/agent-radar/
5. Project Social Media Link (X): https://x.com/vanmuse
- Later sections (after Section I, 14% progress) NOT yet seen — Next button requires all 5 Section I fields filled.

## Fields to paste into the hackathon submission form

- **Project name:** AgentRadar
- **Team / builder:** vanmuse.ai — `0xE65dCfef94a76239733177A04e9a5Bf37CE3AFa7`
- **GitHub repo (public):** https://github.com/vanmuse/agent-radar
- **Website:** https://vanmuse.github.io/agent-radar/ (GitHub Pages, branch gh-pages, building at publish time)
- **Contract address(es) — BSC chain 56:** `0x7c4686636e03fc055b588c1e0f6753048Cd56Cd2` (deployed 18 Nov 2026, tx `0xf38a1a0531254ca585ac39bad957e4ad66b64c00ce260479f5bfb446ec905b26`, block 134,238,782, deployer `0x73dbA5Ea5432283B8F508F4d3b55161F0D575d55`)
- **Agent ID usage description (paste):**
  > AgentRadar gates every state-changing function on Agent ID: each call checks `balanceOf > 0` on the Agent ID contract `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, ERC-721). (1) Radar: Agent ID holders check in once per UTC day, streak recorded on-chain, plus a DYOR-verified free-mint list. (2) Pay by Name: holders opt-in register their own `.ai` name; anyone can pay BNB by typing that name — 100% forwarded in the same transaction, no fee, no custody. (3) Squad: 3-holder teams, wins/losses/points recorded on-chain.
- **Reward receiving address:** `0xE65dCfef94a76239733177A04e9a5Bf37CE3AFa7` (vanmuse.ai) — confirm with user at submit time.

## BscScan verification parameters (exact)

- Source: single file `contracts/AgentRadar.sol`, no imports
- Compiler: **solc 0.8.28**
- Optimizer: **enabled, 200 runs**
- EVM version: **paris**
- License: **MIT**
- Constructor argument: Agent ID contract `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (ABI-encoded address, 32 bytes)

## After deploy — ordered checklist

1. User approves deploy preview (baw `contract-call preview` → show parsed tx + gas → explicit OK → execute). Measured local deploy gas 1,502,066 (~0.0000751 BNB @ 0.05 gwei); re-measure in preview.
2. Record contract address + tx hash in README.md, `web/app.js` (`CONTRACT_ADDRESS`), and this file.
3. Verify source on BscScan with the parameters above.
4. Push git repo to a **public** GitHub repo (open-source requirement) — repo name / account to be chosen by user; `gh` CLI is installed, no remote set yet.
5. Host `web/` (GitHub Pages or other static host), test live: connect → holder status → check-in → register name → small pay → create squad.
6. Promote to reach **≥30 distinct Agent ID addresses** interacting during the submission period (Boltbook lobby + X @vanmuse, check-in + squad drive).
7. Submit the project form before the deadline.
8. Promotion Award (separate, $100 each for 20 winners): post the thread in `promo/X-thread.md` only after user approves the exact copy, then submit its X link via the official campaign survey.

## Status (18 Nov 2026 ~18:40 WIB)

- [x] Contract compiled + local-tested 27/27, frontend built, promo draft written
- [x] Local git repo initialised + committed (no remote yet)
- [x] Deploy — DONE 18 Nov 2026: `0x7c4686636e03fc055b588c1e0f6753048Cd56Cd2`
- [x] BscScan verification — ✅ DONE 2026-11-18 ~19:00 WIB via Etherscan V2 API (`verifysourcecode`, chainid 56, GUID ci5sxjeniy4kjscufiud6svxakp43rfdd7zcggjptkafcxjkch, "Pass - Verified"). NOTE: V2 API requires `codeformat=solidity-single-file`, otherwise bare "Error!".
- [ ] GitHub public push — BLOCKED: needs user to choose repo/account
- [ ] 30-address drive — BLOCKED: needs deployed contract
- [ ] Project submission + promo survey submission — not started
