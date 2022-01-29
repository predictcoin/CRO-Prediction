import { ethers, upgrades } from "hardhat";

async function main() {
  // We get the contract to deploy
  const Prediction = await ethers.getContractFactory("Prediction");
  const predictionAddress = process.env.PREDICTION;
  await upgrades.upgradeProxy(predictionAddress!, Prediction, {
    kind: "uups",
  });

  console.log(
    `Prediction implementation deployed to:${await upgrades.erc1967.getImplementationAddress(
      predictionAddress!
    )}`
  );
}

main().catch((error) => {
  console.error(error);
});
