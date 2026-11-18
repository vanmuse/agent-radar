// AgentRadar frontend — static, no build step.
// All contract calls go through the user's own wallet confirmation.
// Never auto-signs, never asks for seed phrases / private keys / pairing codes.
//
// HOW TO POINT AT THE DEPLOYED CONTRACT:
//   1. Deploy contracts/AgentRadar.sol on BNB Chain (see README.md).
//   2. Replace CONTRACT_ADDRESS below with the deployed address.
//   3. Until then every contract button stays disabled and the page says so.
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TBD — not deployed yet
const AGENT_ID_CONTRACT = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
const BSC_CHAIN_ID = 56;

// Minimal ABI: only the functions this UI uses. Full ABI: build/AgentRadar.json
const ABI = [
  "function checkIn()",
  "function registerName(string name)",
  "function payByName(string name) payable",
  "function createSquad(string name) returns (uint256)",
  "function joinSquad(uint256 id)",
  "function leaveSquad()",
  "function recordSquadResult(uint256 id, bool won, uint256 points)",
  "function isAgentIdHolder(address user) view returns (bool)",
  "function getStreak(address user) view returns (uint256,uint256,uint256)",
  "function resolveName(string name) view returns (address)",
  "function getName(address user) view returns (string)",
  "function getSquad(uint256 id) view returns (uint256,string,address,address[],uint256,uint256,uint256)",
  "function memberSquad(address user) view returns (uint256)",
  "function totalCheckIns() view returns (uint256)",
  "function totalSquads() view returns (uint256)",
];
const AGENT_ID_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const $ = (id) => document.getElementById(id);
const logEl = $("log");
function log(msg) { logEl.textContent += "\n" + msg; }
function say(msg) { log(msg); }

let provider = null, signer = null, contract = null, account = null;
const deployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
if (deployed) $("contractAddr").textContent = CONTRACT_ADDRESS;

document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    $("tab-" + btn.dataset.tab).classList.add("active");
  });
});

async function refreshPublic() {
  if (!contract) return;
  try {
    $("totalCheckIns").textContent = (await contract.totalCheckIns()).toString();
    $("totalSquads").textContent = (await contract.totalSquads()).toString();
  } catch (e) { log("Failed to read totals: " + (e.reason || e.message)); }
}

async function refreshAccount() {
  if (!contract || !account) return;
  const holder = await contract.isAgentIdHolder(account);
  $("holderStatus").innerHTML = holder
    ? '<span class="ok">✅ Agent ID holder</span>'
    : '<span class="bad">❌ Not an Agent ID holder — features locked</span>';
  const [streak, total, lastDay] = await contract.getStreak(account);
  $("streak").textContent = streak.toString();
  $("myCheckIns").textContent = total.toString();
  $("lastDay").textContent = lastDay.toString() === "0" ? "never" : ("UTC day " + lastDay.toString());
  $("myName").textContent = (await contract.getName(account)) || "(not registered)";
  const sq = await contract.memberSquad(account);
  $("mySquad").textContent = sq.toString() === "0" ? "(no squad)" : ("Squad #" + sq.toString());
  document.querySelectorAll("button").forEach((b) => { if (b.id !== "connectBtn") b.disabled = !holder; });
  if (!holder) log("This account does not hold an Agent ID — connect a wallet that holds one.");
}

$("connectBtn").addEventListener("click", async () => {
  try {
    if (!window.ethereum) { alert("No wallet detected. Install a wallet first (e.g. Binance Wallet / MetaMask)."); return; }
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== BSC_CHAIN_ID) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      } catch (e) {
        alert("Switch to BNB Chain (chain 56) in your wallet, then connect again.");
        return;
      }
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    signer = await provider.getSigner();
    account = await signer.getAddress();
    $("account").textContent = account;
    $("chain").textContent = "BNB Chain (56)";
    if (!deployed) {
      log("Connected as " + account + ". The AgentRadar contract is NOT deployed yet — contract buttons stay disabled until the contract address is set in app.js.");
      $("holderStatus").textContent = "Contract not deployed yet.";
      return;
    }
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    log("Connected: " + account);
    await refreshPublic();
    await refreshAccount();
  } catch (e) { log("Connect failed: " + (e.reason || e.message)); }
});

async function sendTx(promise, label) {
  // Every state-changing call shows the wallet confirmation popup first.
  // The user reviews and confirms (or rejects) in their own wallet.
  log(label + " — waiting for your confirmation in the wallet…");
  const tx = await promise;
  log(label + " — sent: " + tx.hash + " (waiting for network confirmation…)");
  await tx.wait();
  log(label + " — confirmed ✅");
  await refreshPublic();
  await refreshAccount();
}

$("checkInBtn").addEventListener("click", async () => {
  try { await sendTx(contract.checkIn(), "Check-in"); }
  catch (e) { log("Check-in failed: " + (e.reason || e.message)); }
});

$("regBtn").addEventListener("click", async () => {
  const name = $("regName").value.trim().toLowerCase();
  if (!name) return alert("Enter a name first.");
  try { await sendTx(contract.registerName(name), "Register name " + name); }
  catch (e) { log("Register name failed: " + (e.reason || e.message)); }
});

$("payName").addEventListener("input", async () => {
  const name = $("payName").value.trim().toLowerCase();
  if (!contract || name.length < 3) { $("payResolve").textContent = "—"; return; }
  try {
    const to = await contract.resolveName(name);
    $("payResolve").textContent = to === ethers.ZeroAddress ? "name not registered" : to;
  } catch { $("payResolve").textContent = "—"; }
});

$("payBtn").addEventListener("click", async () => {
  const name = $("payName").value.trim().toLowerCase();
  const amount = $("payAmount").value.trim();
  if (!name || !amount) return alert("Enter the recipient name and the BNB amount.");
  const to = await contract.resolveName(name);
  if (to === ethers.ZeroAddress) return alert("That name is not registered.");
  if (to.toLowerCase() === account.toLowerCase()) return alert("You cannot pay yourself.");
  if (!confirm("Send " + amount + " BNB to " + name + " (" + to + ")? The funds are forwarded immediately, with no fee, and cannot be undone.")) return;
  try { await sendTx(contract.payByName(name, { value: ethers.parseEther(amount) }), "Pay " + amount + " BNB to " + name); }
  catch (e) { log("Payment failed: " + (e.reason || e.message)); }
});

$("createSquadBtn").addEventListener("click", async () => {
  const name = $("squadName").value.trim();
  if (!name) return alert("Enter a squad name first.");
  try { await sendTx(contract.createSquad(name), "Create squad " + name); }
  catch (e) { log("Create squad failed: " + (e.reason || e.message)); }
});

$("joinSquadBtn").addEventListener("click", async () => {
  const id = $("joinId").value.trim();
  if (!id) return alert("Enter a squad ID first.");
  try { await sendTx(contract.joinSquad(id), "Join squad #" + id); }
  catch (e) { log("Join squad failed: " + (e.reason || e.message)); }
});

$("leaveSquadBtn").addEventListener("click", async () => {
  if (!confirm("Leave your squad?")) return;
  try { await sendTx(contract.leaveSquad(), "Leave squad"); }
  catch (e) { log("Leave squad failed: " + (e.reason || e.message)); }
});

async function recordResult(won) {
  const id = $("resultId").value.trim();
  const points = $("resultPoints").value.trim() || "0";
  if (!id) return alert("Enter a squad ID first.");
  try { await sendTx(contract.recordSquadResult(id, won, points), "Record result for squad #" + id + (won ? " — won" : " — lost")); }
  catch (e) { log("Record result failed: " + (e.reason || e.message)); }
}
$("winBtn").addEventListener("click", () => recordResult(true));
$("loseBtn").addEventListener("click", () => recordResult(false));

$("viewSquadBtn").addEventListener("click", async () => {
  if (!contract) return alert("The contract is not deployed yet.");
  const id = $("viewSquadId").value.trim();
  if (!id) return;
  try {
    const s = await contract.getSquad(id);
    $("squadDetail").textContent = "#" + s[0] + " “" + s[1] + "” — creator " + s[2] + " — members: " + s[3].join(", ") + " — W " + s[4] + " / L " + s[5] + " — points " + s[6];
  } catch (e) { $("squadDetail").textContent = "Squad not found."; }
});

// Curated free-mint examples (data/mints.json). Examples only — verify live.
fetch("../data/mints.json")
  .then((r) => r.json())
  .then((data) => {
    const box = $("mintList");
    box.innerHTML = "<p class='small muted'>" + data.notice + "</p>";
    data.mints.forEach((m) => {
      const div = document.createElement("div");
      div.className = "mint";
      div.innerHTML = "<strong></strong><br><span class='small muted'></span><br><code></code><br><span class='small'></span>";
      div.querySelector("strong").textContent = m.name;
      div.querySelector(".muted").textContent = m.status + " · " + m.priceAtMint + " · example tokenId " + m.tokenIdMinted + " (" + m.mintedOn + ")";
      div.querySelector("code").textContent = m.contract;
      div.querySelectorAll(".small")[1].textContent = m.note;
      box.appendChild(div);
    });
  })
  .catch(() => { $("mintList").innerHTML = "<p class='muted'>The mint list could not be loaded (open it via an http server, see README).</p>"; });

if (!deployed) log("The AgentRadar contract is not deployed yet. See the Deploy section in README.md.");
