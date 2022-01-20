import { expect } from "chai";
import { ethers, upgrades, network } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import axios from "axios";
// eslint-disable-next-line camelcase, node/no-missing-import
import { Prediction, Prediction__factory } from "../typechain";

type _Prediction = Prediction | Contract;

let signers: Signer[], prediction: _Prediction;
let PrederA: Signer;
const { BTC, ETH, DOGE, CRO, LTC, COINGECKO } = process.env;

const tokens = [BTC, ETH, LTC, CRO, DOGE];
const tokenIds = "bitcoin,ethereum,litecoin,crypto-com-chain,dogecoin";
const getPrices: (_tokens: string) => Promise<number[]> = async function (
  _tokens
) {
  const config = { params: { ids: _tokens, vs_currencies: "usd" } };
  const res = await axios.get(`${COINGECKO}/simple/price`, config);
  const __tokens = _tokens.split(",");
  return __tokens.map((token: string): number =>
    Math.trunc(res.data[token].usd * 10 ** 2)
  );
};

const [intervalSeconds, bufferSeconds, betSeconds] = [1800, 100, 1200];

describe("Prediction Tests", () => {
  let CRP: Contract;
  beforeEach(async () => {
    signers = await ethers.getSigners();
    PrederA = signers[0];

    const CRPFactory = await ethers.getContractFactory("CRP");
    CRP = await CRPFactory.deploy();

    // eslint-disable-next-line camelcase
    const PredictionFactory: Prediction__factory =
      (await ethers.getContractFactory("Prediction")) as Prediction__factory; // eslint-disable-line camelcase
    prediction = await upgrades.deployProxy(
      PredictionFactory,
      [
        CRP.address,
        await PrederA.getAddress(),
        await PrederA.getAddress(),
        intervalSeconds,
        bufferSeconds,
        betSeconds,
        ethers.utils.parseUnits("10"),
        10,
      ],
      { kind: "uups" }
    );
    // add tokens
    await prediction.addTokens(tokens);

    // approve prediction contract to spend pred tokens
    await CRP.approve(prediction.address, ethers.utils.parseEther("50"));
  });

  xit("initialisation should add tokens", async () => {
    // check tokens
    const _tokens = await prediction.getTokens();
    expect(_tokens.join()).equal(
      tokens.join(),
      "Tokens not added successfully"
    );
  });

  xit("should remove token", async () => {
    const tokens = await prediction.getTokens();
    const index = Math.floor((Math.random() * 10) % tokens.length);
    await prediction.removeTokens([index], [tokens[index]]);
    const _tokens = await prediction.getTokens();
    expect(_tokens.includes(tokens[index])).to.equal(
      false,
      "token not removed"
    );
  });

  xcontext("Start Round", async () => {
    let currentEpoch: BigNumber;
    beforeEach(async () => {
      const tokenPrices = await getPrices(tokenIds);
      await prediction.startRound(tokens, tokenPrices);
      currentEpoch = await prediction.currentEpoch();
    });

    it("should initialise round", async () => {
      const round = await prediction.getRound(currentEpoch);
      const blockNo = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNo);

      expect(block.timestamp).equal(round.lockedTimestamp);
      expect(currentEpoch).equal(1, "current epoch not updated correctly");
      // type loop = {
      //   (price: string, index: number): boolean;
      // };
      // round.lockedPrices.forEach(
      //   (price, index: { price: string; index: number }) => {
      //     expect(price).to.not.equal(0);
      //     expect(round.lockedOracleIds[index]).to.not.equal(0);
      //     return true;
      //   }
      // );
    });

    xdescribe("User predicts", () => {
      beforeEach(async () => {
        await prediction.predictBear(currentEpoch, tokens[0]);
      });
      it("should update bet Info", async () => {
        const betInfo = await prediction.ledger(
          await prediction.currentEpoch(),
          await PrederA.getAddress()
        );

        expect(betInfo.position).to.equal(1);
        expect(betInfo.token).to.equal(tokens[0]);
        expect(betInfo.amount).to.equal(ethers.utils.parseUnits("10"));
        expect(betInfo.claimed).to.equal(false);
      });
      it("should update Round Info", async () => {
        const round = await prediction.getRound(currentEpoch);
        expect(round.totalAmount).to.equal(ethers.utils.parseUnits("10"));
      });
      it("should not let claim bet before round close", async () => {
        await expect(prediction.claim([currentEpoch])).to.be.revertedWith(
          "Not eligible for refund"
        );
      });
      it("should let user claim bet after round close", async () => {
        await network.provider.send("evm_increaseTime", [86900]);
        await network.provider.send("evm_mine");
        await prediction.claim([currentEpoch]);
        const betInfo = await prediction.ledger(
          await prediction.currentEpoch(),
          await PrederA.getAddress()
        );
        expect(betInfo.claimed).to.equal(true);
      });
    });
  });

  context("Start and End Round", () => {
    let currentEpoch: BigNumber;
    beforeEach(async () => {
      let tokenPrices = await getPrices(tokenIds);
      await prediction.startRound(tokens, tokenPrices);
      currentEpoch = await prediction.currentEpoch();
      await prediction.predictBull(currentEpoch, tokens[0]);
      await network.provider.send("evm_increaseTime", [intervalSeconds]);
      await network.provider.send("evm_mine");
      tokenPrices = await getPrices(tokenIds);
      await prediction.endRound(tokens, tokenPrices);
    });

    it("should update Round Info", async () => {
      const round = await prediction.getRound(currentEpoch);
      const blockNo = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNo);

      expect(block.timestamp).equal(round.closeTimestamp);
      expect(round.oraclesCalled).to.equal(true);
    });

    it("should not let user claim funds", async () => {
      await expect(prediction.claim([currentEpoch])).to.be.revertedWith(
        "Not eligible for refund"
      );
    });

    it("should make user either win or lose", async () => {
      let tokenPrices = await getPrices(tokenIds);
      await prediction.startRound(tokens, tokenPrices);
      const round = await prediction.currentEpoch();
      await prediction.predictBull(await prediction.currentEpoch(), tokens[0]);
      await network.provider.send("evm_increaseTime", [intervalSeconds]);
      await network.provider.send("evm_mine");
      tokenPrices = await getPrices(tokenIds);
      await prediction.endRound(tokens, tokenPrices);

      const won = await prediction.wonRound(await PrederA.getAddress(), round);
      const lost = await prediction.lostRound(
        await PrederA.getAddress(),
        round
      );
      expect(won.toString()).to.not.equal(lost.toString());
    });
  });
});
