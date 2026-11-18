import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = path.resolve(import.meta.dirname, "..");
const srcPath = path.join(root, "contracts", "AgentRadar.sol");
const source = fs.readFileSync(srcPath, "utf8");

const input = {
  language: "Solidity",
  sources: { "AgentRadar.sol": { content: source } },
  settings: {
    // evmVersion "paris": solc 0.8.28 defaults to Cancun (PUSH0 etc.), which
    // older EVMs / local test chains may not support. Paris avoids PUSH0 and
    // is the safe target for BNB Chain deployment.
    evmVersion: "paris",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((e) => e.severity === "error");
const warnings = (output.errors || []).filter((e) => e.severity === "warning");
for (const w of warnings) console.log("WARN:", w.formattedMessage);
if (errors.length) {
  for (const e of errors) console.error("ERROR:", e.formattedMessage);
  process.exit(1);
}
const contract = output.contracts["AgentRadar.sol"]["AgentRadar"];
const bytecode = "0x" + contract.evm.bytecode.object;
const deployed = "0x" + contract.evm.deployedBytecode.object;
fs.mkdirSync(path.join(root, "build"), { recursive: true });
fs.writeFileSync(
  path.join(root, "build", "AgentRadar.json"),
  JSON.stringify(
    {
      contractName: "AgentRadar",
      source: "contracts/AgentRadar.sol",
      compiler: `solc ${solc.version()}`,
      abi: contract.abi,
      bytecode,
      deployedBytecode: deployed,
    },
    null,
    2
  )
);
// Rough deploy-gas estimate: 21,000 base + ~200 gas per creation byte is the
// usual rule of thumb; report both raw size and that estimate, clearly labelled.
const byteLen = (bytecode.length - 2) / 2;
const estGas = 21000 + byteLen * 200;
console.log(JSON.stringify({
  compiled: true,
  solc: solc.version(),
  abiFunctions: contract.abi.filter((x) => x.type === "function").map((x) => x.name),
  bytecodeBytes: byteLen,
  bytecodeHexChars: bytecode.length - 2,
  estDeployGasRuleOfThumb: estGas,
  estDeployCostBNB_at_0_05gwei: (estGas * 0.05e-9).toFixed(8),
  estDeployCostBNB_at_0_1gwei: (estGas * 0.1e-9).toFixed(8),
}, null, 2));
