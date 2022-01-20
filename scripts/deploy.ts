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
      60,
      10,
      30,
      ethers.utils.parseUnits("10"),
      10,
    ],
    { kind: "uups" }
  );

  let implementationAddress = await ethers.provider.getStorageAt(
    prediction.address,
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  );
  const arr = implementationAddress.split("");
  console.log(implementationAddress);
  arr.splice(2, 24);
  implementationAddress = arr.join("");

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
