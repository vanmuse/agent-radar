// Deploy AgentRadar to BSC from the project deployer wallet.
// RUN ONLY AFTER: (1) the deployer wallet is funded with ~0.0002 BNB,
// (2) the user has explicitly approved the deploy (amount + gas level).
// NEVER run automatically. This script only broadcasts when invoked by hand.
//
// Usage:
//   node scripts/deploy.mjs [--gas-price-gwei 0.09] [--rpc https://bsc-dataseed1.bnbchain.org]
//
// Reads the deployer private key from deployer/PRIVATE_KEY.txt (0600, gitignored).
// Writes the deployed address + tx hash to deploy.json (and prints them).
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const rpc = getArg("--rpc", "https://bsc-dataseed1.bnbchain.org");
const gasPriceGwei = getArg("--gas-price-gwei", "0.09"); // medium, ~0.000136 BNB for 1,502,066 gas
const AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

const key = fs.readFileSync(path.join(root, "deployer", "PRIVATE_KEY.txt"), "utf8").trim();
const build = JSON.parse(fs.readFileSync(path.join(root, "build", "AgentRadar.json"), "utf8"));
const provider = new ethers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(key, provider);
console.log("deployer:", wallet.address);
console.log("balance BNB:", ethers.formatEther(await provider.getBalance(wallet.address)));
console.log("chainId:", (await provider.getNetwork()).chainId);

const factory = new ethers.ContractFactory(build.abi, build.bytecode, wallet);
const tx = await factory.getDeployTransaction(AGENT_ID);
const estGas = await provider.estimateGas({ ...tx, from: wallet.address });
console.log("estimated gas:", estGas.toString());
console.log("gas price gwei:", gasPriceGwei);
console.log("estimated cost BNB:", ethers.formatEther(estGas * ethers.parseUnits(gasPriceGwei, "gwei")));
const contract = await factory.deploy(AGENT_ID, {
  gasLimit: (estGas * 120n) / 100n, // 20% buffer over estimate
  gasPrice: ethers.parseUnits(gasPriceGwei, "gwei"),
});
console.log("deploy tx:", contract.deploymentTransaction().hash);
await contract.waitForDeployment();
const address = await contract.getAddress();
console.log("deployed at:", address);
fs.writeFileSync(
  path.join(root, "deploy.json"),
  JSON.stringify({ contract: "AgentRadar", address, deployTx: contract.deploymentTransaction().hash, deployer: wallet.address, agentIdContract: AGENT_ID, gasPriceGwei, estimatedGas: estGas.toString(), chainId: 56, deployedAt: new Date().toISOString() }, null, 2)
);
console.log("wrote deploy.json — next: fill CONTRACT_ADDRESS in web/app.js + verify on BscScan (see SUBMISSION.md).");
