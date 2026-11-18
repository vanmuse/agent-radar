# AgentRadar

**Satu kontrak, satu proyek.** Radar free-mint, bayar pakai nama `.ai`, dan squad 3 orang — semuanya digerbangi oleh Agent ID di BNB Chain.

Dibangun oleh **vanmuse.ai** (`0xE65dCfef94a76239733177A04e9a5Bf37CE3AFa7`) untuk **Agent ID Hackathon** (Binance Wallet x BNB Chain). Submission: 18 Nov 2026 08:00 UTC – 9 Des 2026 08:00 UTC.

> Bukan produk Binance dan bukan afiliasi Binance. Nama proyek tidak memakai "Binance"/"BNB".

## Pitch

Agent ID adalah nama on-chain (`.ai`) dari Agentic Wallet — tapi hari ini ia hampir tidak dipakai di dalam produk. AgentRadar menjadikannya **gerbang dan identitas yang benar-benar dipakai**:

1. **Radar** — holder Agent ID check-in harian on-chain (1x/hari UTC), streak berurutan tercatat, plus daftar free-mint yang sudah lolos DYOR. Alasan nyata untuk kembali tiap hari.
2. **Pay by Name** — kirim BNB dengan mengetik `alice.ai`, bukan alamat `0x…`. Nama didaftarkan sendiri oleh pemiliknya (opt-in), 100% dana diteruskan di transaksi yang sama, tanpa fee dan tanpa custody.
3. **Squad** — tim 3 Agent ID (model tim collab PodMint): buat/gabung squad, catat menang/kalah dan poin on-chain. Reputasi tim yang tidak bisa kabur di tengah jalan.

Satu kontrak = satu alamat kontrak yang dihitung juri (jumlah alamat Agent ID yang berinteraksi, volume, jumlah transaksi), dan satu pengajuan proyek sesuai aturan "each team may submit one project only".

## Cara kerja Agent ID di sini

- **Gate:** semua fungsi state-changing mensyaratkan `balanceOf` > 0 di kontrak Agent ID (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, ERC-721 SPACE ID Agent ID, non-transferable). Pengecekan dilakukan on-chain di setiap call.
- **Identitas:** `registerName` memetakan nama `.ai` ke alamat pemiliknya — hanya pemilik yang bisa mendaftarkan namanya sendiri, satu nama per alamat, bisa ganti (nama lama dibebaskan). Ini **bukan** alat untuk mencari wallet orang lain berdasarkan nama: nama hanya bisa di-resolve kalau pemiliknya sendiri sudah opt-in mendaftarkannya.
- **Squad:** keanggotaan dan hasil dicatat per alamat holder.

## Kontrak

`contracts/AgentRadar.sol` — **satu file, Solidity ^0.8.24, SPDX MIT, TANPA import** (verifikasi BscScan tinggal paste satu file). Dikompilasi dengan `evmVersion: "paris"` (solc 0.8.28 default Cancun memakai PUSH0; Paris adalah target yang aman untuk BNB Chain dan rantai tes lokal).

| Fungsi | Keterangan |
|---|---|
| `checkIn()` | 1x/hari UTC, holder only. Streak naik kalau kemarin juga check-in, reset kalau bolong. |
| `registerName(string)` | 3–32 karakter, hanya `a-z 0-9 . -` (huruf besar ditolak). Unik, 1 nama/alamat. |
| `resolveName(string)` / `getName(address)` | View. |
| `payByName(string)` payable | Teruskan **100%** `msg.value` ke alamat pemilik nama. Tolak: nama tak terdaftar, bayar ke diri sendiri, nilai 0. |
| `createSquad(string)` / `joinSquad(id)` / `leaveSquad()` | Maks. 3 anggota/squad, 1 squad/alamat. |
| `recordSquadResult(id, won, points)` | Hanya anggota squad itu. Update menang/kalah/poin. |
| `isAgentIdHolder(address)` / `getStreak(address)` / `getSquad(id)` | View. |

**Owner = deployer, dan TIDAK ADA fungsi pause / mint / tax / withdraw / fee / approval / custody.** `receive()` dan `fallback()` sengaja revert — kontrak tidak pernah menyimpan dana pengguna. Satu-satunya "owner power" adalah tidak ada.

## Status tes (lokal, 18 Nov 2026)

- **Compile: PASS.** `node test/compile-test.mjs` — 14/14 fungsi wajib ada di ABI, 0 error. Bytecode **6.844 byte** (solc 0.8.28, optimizer 200 runs, evmVersion paris).
- **Local deploy test: PASS, 27/27 checks** (`node test/local-deploy-test.mjs`, ganache in-process + mock Agent ID):
  check-in & streak (termasuk reset setelah bolong sehari), tolak non-holder, tolak check-in 2x sehari, register nama (tolak huruf besar, terlalu pendek, nama sudah dipakai, non-holder), re-register membebaskan nama lama, payByName meneruskan penuh 0,01 ETH, tolak nama tak dikenal / self-pay / nilai 0, tolak transfer ETH langsung, squad (maks. 3, 1 squad/alamat, catat hasil, non-member ditolak, keluar squad).
- **Deploy gas terukur (lokal): 1.502.066 gas** → ±0,0000751 BNB di 0,05 gwei, ±0,0001502 BNB di 0,1 gwei. Jauh di bawah saldo wallet deployer (±0,000509 BNB). Angka gas di mainnet bisa sedikit berbeda; cek lagi saat preview deploy.
- Dua pelajaran yang dicatat di test: (1) solc default Cancun gagal di rantai lama karena PUSH0 — makanya `evmVersion: "paris"`; (2) ethers v6 men-cache nomor blok, jadi tes saldo memakai raw JSON-RPC (`eth_getBalance`) — lihat komentar di `test/local-deploy-test.mjs`.

**Yang BELUM dilakukan (butuh persetujuan user):** deploy ke BSC, verifikasi BscScan, publish GitHub, posting X. Semuanya belum dieksekusi — lihat Checklist di bawah.

## Jalankan lokal

```bash
cd agentid-hackathon
npm install            # solc + ethers + ganache (dev/test lokal saja)
node test/compile-test.mjs        # compile + cek ABI
node test/local-deploy-test.mjs   # deploy lokal + 27 checks

# Frontend (static, tanpa build step):
python3 -m http.server 8080
# buka http://localhost:8080/web/
```

Catatan: frontend memuat `../data/mints.json`, jadi harus disajikan lewat http server dari root proyek (bukan `file://` dan bukan hanya dari folder `web/`).

## Deploy + verifikasi BscScan (setelah user setuju)

1. Siapkan wallet deployer `vanmuse.ai` dengan BNB secukupnya (±0,0002 BNB sudah lebih dari cukup untuk deploy di gas normal — ukur ulang saat preview).
2. Deploy `contracts/AgentRadar.sol` dengan constructor arg = alamat kontrak Agent ID `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`. **Jangan deploy dari script otomatis** — buat preview transaksi, tunjukkan ke user, jalankan hanya setelah OK eksplisit.
3. Verifikasi source di BscScan: single file, compiler 0.8.28, optimizer enabled 200 runs, evmVersion paris, license MIT.
4. Isi alamat kontrak di `web/app.js` (`CONTRACT_ADDRESS`), ganti `TBD` di file ini, commit + push ke GitHub (repo public, open-source — syarat hackathon).
5. Uji live di frontend: connect wallet → status holder → check-in → daftar nama → bayar kecil → buat squad. Semua transaksi dikonfirmasi manual di wallet.
6. Submit: nama proyek, website, alamat kontrak, deskripsi pemakaian Agent ID — di periode submission (s.d. 9 Des 2026 08:00 UTC).

## Kepatuhan safety / red lines hackathon

- ❌ Tanpa login QR / kode pairing di web. Login = connect wallet biasa (injected `window.ethereum`).
- ❌ Tanpa bypass konfirmasi transaksi. Semua call state-changing memunculkan popup konfirmasi wallet; tidak ada auto-sign.
- ❌ Tanpa transfer otomatis / terjadwal / bundled. `payByName` hanya jalan saat user sendiri mengirimnya.
- ❌ Tanpa unlimited approval. Kontrak tidak pernah meminta approval token apa pun.
- ✅ Kontrak open-source, 1 file, tanpa import; tidak ada owner power atas dana user (lihat tabel di atas).
- ❌ Nama proyek/token/domain tidak memakai "Binance"/"BNB".
- ❌ Tidak mengumpulkan seed phrase / private key / API secret / pairing code — tidak ada satu pun field untuk itu.
- ❌ Tanpa janji "passive income" / "automatic money-making". Tidak ada imbal hasil apa pun di produk ini.
- ⚠️ Halaman trading: produk ini bukan halaman trading, tapi peringatan risiko tetap tampil di atas frontend, plus peringatan DYOR + cek Sourcify/BscScan di setiap daftar mint.
- ✅ Pay by Name bukan alat lookup wallet orang lain: nama hanya terdaftar oleh pemiliknya sendiri (opt-in).

## Rencana 30 alamat (syarat Innovation Award)

Minimal 30 alamat Agent ID berbeda harus berinteraksi dengan kontrak selama periode submission. Rencana: promosikan check-in harian + squad ke komunitas Boltbook (lobby/collab) dan X @vanmuse; setiap anggota squad = 1 alamat; leaderboard streak memberi alasan kembali tiap hari. Progres dihitung dari event on-chain (`CheckIn`, `NameRegistered`, `Paid`, `SquadCreated`), bukan dari klaim.

## Submission checklist

- [x] Kontrak ditulis, dikompilasi, dites lokal (27/27)
- [x] Frontend statis selesai (3 tab + peringatan risiko)
- [x] `data/mints.json` contoh (5 mint nyata, berlabel contoh)
- [x] Draft thread X (`promo/X-thread.md`) — BELUM diposting
- [ ] Deploy ke BSC (butuh OK user + preview)
- [ ] Verifikasi BscScan + repo GitHub public
- [ ] Isi alamat kontrak di `web/app.js` + README
- [ ] Capai 30 alamat Agent ID (promosi Boltbook + X)
- [ ] Submit proyek (form hackathon) sebelum 9 Des 2026 08:00 UTC
- [ ] Submit link thread X ke survei Promotion Award

## Struktur

```
agentid-hackathon/
├── contracts/AgentRadar.sol   # kontrak (1 file, tanpa import)
├── scripts/compile.mjs        # compile solc-js -> build/AgentRadar.json
├── build/AgentRadar.json       # ABI + bytecode hasil compile
├── test/
│   ├── compile-test.mjs       # cek compile + ABI
│   ├── local-deploy-test.mjs  # deploy ganache + 27 checks
│   └── MockAgentID.sol        # mock KHUSUS tes (bukan bagian submission)
├── web/                       # frontend statis (index.html, app.js, style.css)
├── data/mints.json             # contoh free-mint (berlabel contoh, verifikasi live)
├── promo/X-thread.md           # draft thread X (belum diposting)
└── README.md
```

## Lisensi

MIT.
