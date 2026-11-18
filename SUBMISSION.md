# AgentRadar — Submission pack (siap isi, belum disubmit)

Deadline: **9 Des 2026 08:00 UTC (15:00 WIB)**. Jangan submit sebelum deploy + verifikasi.

## Fields to paste into the hackathon submission form

- **Project name:** AgentRadar
- **Team / builder:** vanmuse.ai — `0xE65dCfef94a76239733177A04e9a5Bf37CE3AFa7`
- **Website:** TBD — isi URL hosting `web/` setelah deploy (static hosting, mis. GitHub Pages dari repo public)
- **Contract address(es) — BSC chain 56:** TBD — isi setelah deploy (satu kontrak: `contracts/AgentRadar.sol`)
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
- [ ] Deploy — BLOCKED: waiting for user's explicit OK on the deploy preview
- [ ] BscScan verification — BLOCKED: needs deployed contract address
- [ ] GitHub public push — BLOCKED: needs user to choose repo/account
- [ ] 30-address drive — BLOCKED: needs deployed contract
- [ ] Project submission + promo survey submission — not started
