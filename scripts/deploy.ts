import { ethers, upgrades } from "hardhat";

async function main() {
  const { DOGE, BTC, ETH, LTC, CRO, CRP } = process.env;
  const tokens = [DOGE, BTC, ETH, LTC, CRO];

  const [signer] = await ethers.getSigners();
  // We get the contract to deploy
  const Prediction = await ethers.getContractFactory("Prediction");

  const prediction = await upgrades.deployProxy(
    Prediction,
    [
      CRP,
      signer.address,
      signer.address,
      345600,
      1800,
      3600,
      ethers.utils.parseUnits("10"),
      10,
    ],
    { kind: "uups" }
  );

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    prediction.address
  );

  await prediction.addTokens(tokens);

  console.log(
    `Prediction deployed to:${prediction.address}`,
    `implementation deployed to:${implementationAddress}`
  );

  // await hre.run("verify:verify", {
  //   address: implementationAddress,
  //   constructorArguments: [],
  // });
}

main().catch((error) => {
  console.error(error);
});
