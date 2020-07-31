var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./TokenRepository.sol");
const fs = require("fs");
const { soliditySha3 } = require("web3-utils");
const { expectRevert, time, balance } = require("@openzeppelin/test-helpers");
const BN = require("bn.js");
const { exception } = require("console");

const gasPrice = new BN(20000000000);
function getSealedBid(_bid, _secret) {
  return soliditySha3({ t: "uint", v: _bid }, { t: "string", v: _secret });
}

contract("VickreyAuctionHouse", async (accounts) => {
  const tokenId = 1234567;
  var auctionId;
  var balanceContractTracker;

  var bids = [1, 1, 3, 4, 8];
  var deposits = [1, 3, 5, 5, 10];
  var secrets = ["01", "12345", "hidden", "secret", "gulf"];
  var sealedBids = [];
  var balanceTracker = [];

  let auctionHouse;
  let tokenRepo;

  beforeEach("setup contract for each test", async function () {
    auctionHouse = await VickreyAuctionHouse.deployed();
    tokenRepo = await TokenRepository.deployed();
    var i;
    for (i = 0; i < bids.length; i++) {
      balanceTracker[parseInt(i)] = await balance.tracker(accounts[parseInt(i)]);
    }
  });

  it("It should check if the auction repository is initialized", async () => {
    expect(auctionHouse);
    balanceContractTracker = await balance.tracker(auctionHouse.address);
    fs.writeFileSync("./test/output.address", auctionHouse.address);
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should not create a new auction: Token does not exist.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "ERC721: owner query for nonexistent token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should not create a new auction: Token is not owned by Contract.", async () => {
    await tokenRepo.registerToken(accounts[0], tokenId, {
      from: accounts[0],
    });
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "Contract is not the owner of token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should transfer the token to the smart contract.", async () => {
    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(accounts[0]);

    tokenRepo.safeTransferFrom(tokenOwner, auctionHouse.address, tokenId, {
      from: tokenOwner,
    });
    tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(auctionHouse.address);
  });

  it("It should not create a new auction: Not the correct previous owner of token.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "Not the correct previous owner of this token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should create a new auction.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);

    let timestamp = new Date().getTime();
    let result = await auctionHouse.createAuction(
      tokenId,
      tokenRepo.address,
      "Selling One Token",
      timestamp + 10000,
      timestamp + 30000,
      { from: accounts[0] }
    );
    auctionId = result.logs[0].args[0].toNumber();

    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(1);

    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[0].toNumber()).to.be.equal(tokenId);
    expect(auction[1]).to.be.equal(tokenRepo.address);
    expect(auction[2]).to.be.equal("Selling One Token");
    expect(auction[3]).to.be.equal(accounts[0]);
    expect(auction[4]).to.be.equal(true);
    expect(auction[5].toNumber()).to.be.equal(timestamp + 10000);
    expect(auction[6].toNumber()).to.be.equal(timestamp + 30000);
    expect(auction[7]).to.be.equal(
      "0x0000000000000000000000000000000000000000"
    );
    expect(auction[8].toNumber()).to.be.equal(0);
    expect(auction[9].toNumber()).to.be.equal(0);
  });

  it("It should cancel an auction.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);

    await auctionHouse.cancelAuction(0);
    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(accounts[0]);

    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);
  });

  it("It should bid on an auction.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(1);
    tokenRepo.safeTransferFrom(accounts[0], auctionHouse.address, tokenId, {
      from: accounts[0],
    });

    let timestamp = new Date().getTime();
    let result = await auctionHouse.createAuction(
      tokenId,
      tokenRepo.address,
      "Selling One Token",
      timestamp + 10000,
      timestamp + 30000,
      { from: accounts[0] }
    );

    auctionId = result.logs[0].args[0].toNumber();
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(0);
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(2);
    expect(bids.length).to.be.equal(secrets.length);
    expect(deposits.length).to.be.equal(secrets.length);

    var i;
    var sumOfDeposits = 0;
    for (i = 1; i < bids.length; i++) {
      sealedBids[parseInt(i)] = getSealedBid(bids[parseInt(i)], secrets[parseInt(i)]);
      sumOfDeposits += deposits[parseInt(i)];
      await balanceContractTracker.delta();
      await balanceTracker[parseInt(i)].delta();

      let result = await auctionHouse.sealedBid(auctionId, sealedBids[parseInt(i)], {
        from: accounts[parseInt(i)],
        value: deposits[parseInt(i)],
      });

      let deltaAuctionHouse = await balanceContractTracker.delta();

      // AuctionHouse has more money from deposits.
      expect(deltaAuctionHouse.cmp(new BN(deposits[parseInt(i)]))).to.be.equal(0);

      let delta = await balanceTracker[parseInt(i)].delta();
      let payment = new BN(result.receipt.gasUsed)
        .mul(gasPrice)
        .add(new BN(deposits[parseInt(i)]));

      // Bidder has less money than before bid.
      expect(payment.cmp(delta.abs())).to.be.equal(0);
    }
    bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);
  });

  it("It should not bid on own auction.", async () => {
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);

    //sealedBid = soliditySha3({ t: "uint", v: 2 }, { t: "string", v: "34" });
    sealedBids[parseInt(0)] = getSealedBid(bids[0], secrets[0]);

    await expectRevert(
      auctionHouse.sealedBid(auctionId, sealedBids[0], {
        from: accounts[0],
        value: deposits[0],
      }),
      "The owner of an auction is not allowed to bid/reveal."
    );

    bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);
  });

  it("It should not reveal bid, auction still running.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId, bids[1], secrets[1], {
        from: accounts[1],
      }),
      "Auction still running."
    );
  });

  it("It should not reveal bid, owner is not allowed to reveal.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId, bids[0], secrets[0], {
        from: accounts[0],
      }),
      "The owner of an auction is not allowed to bid/reveal."
    );
  });

  it("it should end the bidding time.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    let timestamp = await time.latest();

    // How long does it take, until the auction is ended?
    let timeleft = auction[5].toNumber() - timestamp;

    // Manipulate the time in the Blockchain, so the auction is ended.
    await time.increase(timeleft + 1);

    timestamp = await time.latest();
    timeleft = auction[5].toNumber() - timestamp;

    // Expect the time left to be less than 0 seconds: Time over
    expect(timeleft < 0).to.be.equal(true);
  });

  it("It should reveal bids.", async () => {
    var i;
    for (i = 1; i < bids.length; i++) {
      let refund = await auctionHouse.getRefund(accounts[parseInt(i)]);
      expect(refund.toNumber()).to.be.equal(0);

      await auctionHouse.reveal(auctionId, bids[parseInt(i)], secrets[parseInt(i)], {
        from: accounts[parseInt(i)],
      });
      refund = await auctionHouse.getRefund(accounts[parseInt(i)]);
      expect(refund.toNumber()).to.be.equal(deposits[parseInt(i)] - bids[parseInt(i)]);

      let auction = await auctionHouse.getAuctionById(auctionId);
      expect(auction[7]).to.be.equal(accounts[parseInt(i)]);
      expect(auction[8].toNumber()).to.be.equal(bids[parseInt(i)]);
    }
  });

  it("it should end the reveal time.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    let timestamp = await time.latest();

    // How long does it take, until the auction is ended?
    let timeleft = auction[6].toNumber() - timestamp;

    // Manipulate the time in the Blockchain, so the auction is ended.
    await time.increase(timeleft + 1);

    timestamp = await time.latest();
    timeleft = auction[6].toNumber() - timestamp;

    // Expect the time left to be less than 0 seconds: Time over
    expect(timeleft < 0).to.be.equal(true);
  });

  it("It should end an auction and transfer the token.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);

    var refunds = [];
    var i;
    for (i = 0; i < bids.length; i++) {
      refunds[parseInt(i)] = await auctionHouse.getRefund(accounts[parseInt(i)]);
    }
    expect(refunds[0].toNumber()).to.be.equal(0);
    expect(refunds[1].toNumber()).to.be.equal(deposits[1]);
    expect(refunds[2].toNumber()).to.be.equal(deposits[2]);
    expect(refunds[3].toNumber()).to.be.equal(deposits[3]);
    expect(refunds[4].toNumber()).to.be.equal(deposits[4] - bids[4]);

    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(auctionHouse.address);

    await auctionHouse.endAuction(auctionId);
    tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(accounts[4]);

    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);
  });

  it("It should withdraw the money.", async () => {
    //let auction = await auctionHouse.getAuctionById(auctionId);
    await balanceContractTracker.delta();
    let gasCosts = [];
    let deltas = [];
    var i;
    for (i = 0; i < bids.length; i++) {
      await balanceTracker[parseInt(i)].delta();
      let result = await auctionHouse.withdraw({ from: accounts[parseInt(i)] });
      gasCosts[parseInt(i)] = new BN(result.receipt.gasUsed).mul(gasPrice);
      deltas[parseInt(i)] = await balanceTracker[parseInt(i)].delta();
    }

    // Seller gets the second highes bid, but has to pay the gas.
    expect(
      new BN(bids[3]).sub(gasCosts[0]).abs().cmp(deltas[0].abs())
    ).to.be.equal(0);

    // Bidders get their deposits, but have to pay the gas.
    expect(
      new BN(deposits[1]).sub(gasCosts[1]).abs().cmp(deltas[1].abs())
    ).to.be.equal(0);
    expect(
      new BN(deposits[2]).sub(gasCosts[2]).abs().cmp(deltas[2].abs())
    ).to.be.equal(0);
    expect(
      new BN(deposits[3]).sub(gasCosts[3]).abs().cmp(deltas[3].abs())
    ).to.be.equal(0);

    // Highest Bidder gets the difference of the deposit and the second highest bid.
    expect(
      new BN(deposits[4])
        .sub(new BN(bids[3]))
        .sub(gasCosts[4])
        .abs()
        .cmp(deltas[4].abs())
    ).to.be.equal(0);

    let balanceContract = await balanceContractTracker.get();
    expect(balanceContract.cmp(new BN(0))).to.be.equal(0);
  });
});
