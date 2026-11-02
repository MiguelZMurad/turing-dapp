// Script de deploy do contrato Turing.
// Além de fazer o deploy, salva o endereço e a ABI do contrato
// em frontend/src/contracts, de onde a dApp vai lê-los.
const path = require("path");

async function main() {
  // Avisa se estiver rodando na rede embutida (o deploy se perde ao terminar)
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which " +
        "gets automatically created and destroyed every time. Use the Hardhat " +
        "option '--network localhost'"
    );
  }

  // A conta #0 faz o deploy e vira o owner do contrato
  const [deployer] = await ethers.getSigners();
  console.log("Deploying the contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Turing = await ethers.getContractFactory("Turing");
  const turing = await Turing.deploy();
  await turing.deployed();

  console.log("Turing address:", turing.address);
  console.log("Owner:", await turing.owner());
  console.log("Total supply:", (await turing.totalSupply()).toString());
  console.log("Voting active:", await turing.voting());

  saveFrontendFiles(turing);
}

function saveFrontendFiles(turing) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Turing: turing.address }, undefined, 2)
  );

  const TuringArtifact = artifacts.readArtifactSync("Turing");

  fs.writeFileSync(
    path.join(contractsDir, "Turing.json"),
    JSON.stringify(TuringArtifact, null, 2)
  );

  console.log("Frontend files saved to", contractsDir);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });