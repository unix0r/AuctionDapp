var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./EmissionRepository.sol");
const fs = require("fs");
const {soliditySha3} = require("web3-utils");
const {expectRevert, time, balance} = require("@openzeppelin/test-helpers");
const BN = require("bn.js");
const {expect} = require("chai");

const gasPrice = new BN("4A817C800", 16); // GasPrice of Ganache.
function getSealedBid(_bid, _secret) {
  return soliditySha3({t: "uint", v: _bid}, {t: "string", v: _secret});
}

contract("VickreyAuctionHouse", async (accounts) => {
  const tokenId = 1234567;
  var auctionId;
  var balanceContractTracker;

  var bids = [1, 1, 3, 4, 8, 6];
  var deposits = [1, 3, 5, 5, 10, 8];
  var secrets = ["01", "12345", "hidden", "secret", "gulf", "sierra"];
  var sealedBids = [];
  var balanceTracker = [];

  let auctionHouse;
  let tokenRepo;

  beforeEach("setup contract for each test", async function () {
    auctionHouse = await VickreyAuctionHouse.deployed();
    tokenRepo = await TokenRepository.deployed();
    var i;
    for (i = 0; i < accounts.length; i++) {
      balanceTracker[parseInt(i, 10)] = await balance.tracker(accounts[parseInt(i, 10)]);
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
        {from: accounts[1]}
      ),
      "ERC721: owner query for nonexistent token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should not create a new auction: Token is not owned by Contract.", async () => {
    await tokenRepo.registerEmission(accounts[0], tokenId, {
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
        {from: accounts[1]}
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
        {from: accounts[1]}
      ),
      "Not the correct previous owner of this token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should not create a new auction: Bid Timeslot is already over.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
    await time.advanceBlock();
    let timestamp = await time.latest();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId,
        tokenRepo.address,
        "Selling One Token",
        timestamp.sub(new BN(10000)).toNumber(),
        timestamp.add(new BN(30000)).toNumber(),
        {from: accounts[0]}
      ),
      "Bidding Time is alreay finished."
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should not create a new auction: Reveal Timeslot before Bid Timeslot.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
    await time.advanceBlock();
    let timestamp = await time.latest();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId,
        tokenRepo.address,
        "Selling One Token",
        timestamp.add(new BN(30000)).toNumber(),
        timestamp.sub(new BN(10000)).toNumber(),
        {from: accounts[0]}
      ),
      "Reveal Time must end after Bidding Time."
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);
  });

  it("It should create a new auction.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(0);

    await time.advanceBlock();
    let timestamp = await time.latest();
    let result = await auctionHouse.createAuction(
      tokenId,
      tokenRepo.address,
      "Selling One Token",
      timestamp.add(new BN(10000)).toNumber(),
      timestamp.add(new BN(30000)).toNumber(),
      {from: accounts[0]}
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
    expect(auction[5].toNumber()).to.be.equal(timestamp.add(new BN(10000)).toNumber());
    expect(auction[6].toNumber()).to.be.equal(timestamp.add(new BN(30000)).toNumber());
    expect(auction[7]).to.be.equal("0x0000000000000000000000000000000000000000");
    expect(auction[8].toNumber()).to.be.equal(0);
    expect(auction[9].toNumber()).to.be.equal(0);
  });

  it("It should not cancel an auction: Wrong owner", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);

    await expectRevert(
      auctionHouse.cancelAuction(auctionId, {from: accounts[1]}),
      "Not the correct owner of the auction."
    );
    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(auctionHouse.address);

    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);
  });

  it("It should cancel an auction.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);

    await auctionHouse.cancelAuction(auctionId);
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

    await time.advanceBlock();
    let timestamp = await time.latest();
    let result = await auctionHouse.createAuction(
      tokenId,
      tokenRepo.address,
      "Selling One Token",
      timestamp.add(new BN(10000)).toNumber(),
      timestamp.add(new BN(30000)).toNumber(),
      {from: accounts[0]}
    );

    auctionId = result.logs[0].args[0].toNumber();
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(0);
    auctionLength = await auctionHouse.getAuctionsCount();
    expect(auctionLength.toNumber()).to.be.equal(2);
    expect(bids.length).to.be.equal(secrets.length);
    expect(deposits.length).to.be.equal(secrets.length);

    var i;
    for (i = 1; i < bids.length; i++) {
      sealedBids[parseInt(i, 10)] = getSealedBid(bids[parseInt(i, 10)], secrets[parseInt(i, 10)]);
      await balanceContractTracker.delta();
      await balanceTracker[parseInt(i, 10)].delta();

      let result = await auctionHouse.sealedBid(auctionId, sealedBids[parseInt(i, 10)], {
        from: accounts[parseInt(i, 10)],
        value: deposits[parseInt(i, 10)],
      });

      let deltaAuctionHouse = await balanceContractTracker.delta();

      // AuctionHouse has more money from deposits.
      expect(deltaAuctionHouse.cmp(new BN(deposits[parseInt(i, 10)]))).to.be.equal(0);

      let delta = await balanceTracker[parseInt(i, 10)].delta();
      let payment = new BN(result.receipt.gasUsed).mul(gasPrice).add(new BN(deposits[parseInt(i, 10)]));

      // Bidder has less money than before bid.
      expect(payment.cmp(delta.abs())).to.be.equal(0);
    }
    bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);
  });

  it("It should not cancel an auction: There are already bids.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount > 0).to.be.equal(true);
    expect(auction[4]).to.be.equal(true);

    await expectRevert(auctionHouse.cancelAuction(auctionId), "There are already bids in this auction.");

    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(true);

    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(auctionHouse.address);
  });

  it("It should not bid on own auction.", async () => {
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);

    //sealedBid = soliditySha3({ t: "uint", v: 2 }, { t: "string", v: "34" });
    sealedBids[parseInt(0, 10)] = getSealedBid(bids[0], secrets[0]);

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

  it("It should not bid on auction, account already bid.", async () => {
    let bidCount0 = await auctionHouse.getBidCount(auctionId);
    let sealedBid = getSealedBid(10, "Hello");

    await expectRevert(
      auctionHouse.sealedBid(auctionId, sealedBid, {
        from: accounts[1],
        value: deposits[1],
      }),
      "User has already bid on this auction."
    );
    let bidCount1 = await auctionHouse.getBidCount(auctionId);
    expect(bidCount0.cmp(bidCount1)).to.be.equal(0);
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

  it("It should not bid: Bid time is over.", async () => {
    let bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);

    sealedBids[parseInt(0, 10)] = getSealedBid(bids[0], secrets[0]);

    await expectRevert(
      auctionHouse.sealedBid(auctionId, sealedBids[0], {
        from: accounts[0],
        value: deposits[0],
      }),
      "Auction is not running."
    );

    bidCount = await auctionHouse.getBidCount(auctionId);
    expect(bidCount.toNumber()).to.be.equal(bids.length - 1);
  });

  it("It should not reveal bid: Bad reveal.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId, bids[1], secrets[2], {
        from: accounts[1],
      }),
      "Bid was not correctly revealed."
    );
  });

  it("It should not end an auction: Auction still running.", async () => {
    await expectRevert(auctionHouse.endAuction(auctionId), "Auction still running.");
  });

  it("It should reveal bids.", async () => {
    var i;
    for (i = 1; i < bids.length - 1; i++) {
      let refund = await auctionHouse.getRefund(accounts[parseInt(i, 10)]);
      expect(refund.toNumber()).to.be.equal(0);
      await auctionHouse.reveal(auctionId, bids[parseInt(i, 10)], secrets[parseInt(i, 10)], {
        from: accounts[parseInt(i, 10)],
      });
      refund = await auctionHouse.getRefund(accounts[[parseInt(i, 10)]]);
      expect(refund.toNumber()).to.be.equal(deposits[parseInt(i, 10)] - bids[parseInt(i, 10)]);

      let auction = await auctionHouse.getAuctionById(auctionId);
      expect(auction[7]).to.be.equal(accounts[[parseInt(i, 10)]]);
      expect(auction[8].toNumber()).to.be.equal(bids[parseInt(i, 10)]);
    }

    let auction = await auctionHouse.getAuctionById(auctionId);

    expect(auction[7]).to.be.equal(accounts[bids.length - 2]);
    expect(auction[8].toNumber()).to.be.equal(bids[bids.length - 2]);

    await auctionHouse.reveal(auctionId, bids[bids.length - 1], secrets[bids.length - 1], {
      from: accounts[bids.length - 1],
    });
    let refund = await auctionHouse.getRefund(accounts[bids.length - 1]);
    expect(refund.toNumber()).to.be.equal(deposits[bids.length - 1]);
    auction = await auctionHouse.getAuctionById(auctionId);

    expect(auction[7]).to.be.equal(accounts[bids.length - 2]);
    expect(auction[8].toNumber()).to.be.equal(bids[bids.length - 2]);
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
      refunds[[parseInt(i, 10)]] = await auctionHouse.getRefund(accounts[[parseInt(i, 10)]]);
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

  it("It should not reveal bid, auction is not alive.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId, bids[0], secrets[0], {
        from: accounts[1],
      }),
      "Auction is not running."
    );
  });

  it("It should not cancel an auction: The auction is not alive.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);

    await expectRevert(auctionHouse.cancelAuction(0), "Auction is not alive.");
    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);
  });

  it("It should not bid on auction: The auction is not alive.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);
    let badBid = getSealedBid(13, "secret");

    await expectRevert(
      auctionHouse.sealedBid(auctionId, badBid, {
        from: accounts[5],
        value: 10,
      }),
      "Auction is not running."
    );
    auction = await auctionHouse.getAuctionById(auctionId);
    expect(auction[4]).to.be.equal(false);
  });

  it("It should not withdraw money: No money to withdraw.", async () => {
    await balanceTracker[bids.length + 1].delta();

    await expectRevert(
      auctionHouse.withdraw({
        from: accounts[bids.length + 1],
      }),
      "No money to withdraw."
    );
  });

  it("It should withdraw the money.", async () => {
    //let auction = await auctionHouse.getAuctionById(auctionId);
    await balanceContractTracker.delta();
    let gasCosts = [];
    let deltas = [];
    var i;
    for (i = 0; i < bids.length - 1; i++) {
      await balanceTracker[[parseInt(i, 10)]].delta();
      let result = await auctionHouse.withdraw({
        from: accounts[[parseInt(i, 10)]],
      });
      gasCosts[[parseInt(i, 10)]] = new BN(result.receipt.gasUsed).mul(gasPrice);
      deltas[[parseInt(i, 10)]] = await balanceTracker[[parseInt(i, 10)]].delta();
    }

    await balanceTracker[bids.length - 1].delta();
    let result = await auctionHouse.withdraw({
      from: accounts[bids.length - 1],
    });
    gasCosts[bids.length - 1] = new BN(result.receipt.gasUsed).mul(gasPrice);
    deltas[bids.length - 1] = await balanceTracker[[bids.length - 1]].delta();

    // Seller gets the second highes bid, but has to pay the gas.
    expect(new BN(bids[3]).sub(gasCosts[0]).abs().cmp(deltas[0].abs())).to.be.equal(0);

    // Bidders get their deposits, but have to pay the gas.
    expect(new BN(deposits[1]).sub(gasCosts[1]).abs().cmp(deltas[1].abs())).to.be.equal(0);
    expect(new BN(deposits[2]).sub(gasCosts[2]).abs().cmp(deltas[2].abs())).to.be.equal(0);
    expect(new BN(deposits[3]).sub(gasCosts[3]).abs().cmp(deltas[3].abs())).to.be.equal(0);

    // Highest Bidder gets the difference of the deposit and the second highest bid.
    expect(new BN(deposits[4]).sub(new BN(bids[3])).sub(gasCosts[4]).abs().cmp(deltas[4].abs())).to.be.equal(0);

    let balanceContract = await balanceContractTracker.get();
    expect(balanceContract.cmp(new BN(0))).to.be.equal(0);
  });

  it("It should not take a revealed bid: Deposit not enough.", async () => {
    tokenRepo.safeTransferFrom(accounts[4], auctionHouse.address, tokenId, {
      from: accounts[4],
    });

    await time.advanceBlock();
    let timestamp = await time.latest();
    let result = await auctionHouse.createAuction(
      tokenId,
      tokenRepo.address,
      "Selling One Token",
      timestamp.add(new BN(10000)).toNumber(),
      timestamp.add(new BN(30000)).toNumber(),
      {from: accounts[4]}
    );

    auctionId = result.logs[0].args[0].toNumber();

    let badBid = getSealedBid(13, "secret");
    result = await auctionHouse.sealedBid(auctionId, badBid, {
      from: accounts[5],
      value: 10,
    });
    let refund = await auctionHouse.getRefund(accounts[5]);
    expect(refund.toNumber()).to.be.equal(0);

    let auction = await auctionHouse.getAuctionById(auctionId);
    timestamp = await time.latest();

    // How long does it take, until the auction is ended?
    let timeleft = auction[5].toNumber() - timestamp;

    // Manipulate the time in the Blockchain, so the auction is ended.
    await time.increase(timeleft + 1);

    await auctionHouse.reveal(auctionId, 13, "secret", {
      from: accounts[5],
    });
    auction = await auctionHouse.getAuctionById(auctionId);
    refund = await auctionHouse.getRefund(accounts[5]);
    expect(refund.toNumber()).to.be.equal(10);

    expect(auction[7]).to.be.equal("0x0000000000000000000000000000000000000000");
    expect(auction[8].toNumber()).to.be.equal(0);
    expect(auction[9].toNumber()).to.be.equal(0);

    timestamp = await time.latest();
    // How long does it take, until the auction is ended?
    timeleft = auction[6].toNumber() - timestamp;
    // Manipulate the time in the Blockchain, so the auction is ended.
    await time.increase(timeleft + 1);

    await auctionHouse.endAuction(auctionId);

    let tokenOwner = await tokenRepo.ownerOf(tokenId);
    expect(tokenOwner).to.be.equal(accounts[4]);
  });

  it("It should not cancel auction: The auctionId does not exist", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    await expectRevert(auctionHouse.cancelAuction(auctionLength.add(new BN(1)).toNumber()), "Auction does not exist.");
  });

  it("It should not bid on an auction: The auctionId does not exist", async () => {
    let sealedBid = getSealedBid(10, "Hello");
    let auctionLength = await auctionHouse.getAuctionsCount();
    await expectRevert(
      auctionHouse.sealedBid(auctionLength.add(new BN(1)).toNumber(), sealedBid, {
        from: accounts[1],
        value: deposits[1],
      }),
      "Auction does not exist."
    );
  });

  it("It should not reveal a bid: The auctionId does not exist", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    await expectRevert(
      auctionHouse.reveal(auctionLength.add(new BN(1)).toNumber(), bids[0], secrets[0], {
        from: accounts[1],
      }),
      "Auction does not exist."
    );
  });

  it("It should not end an auction: The auctionId does not exist", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    await expectRevert(auctionHouse.endAuction(auctionLength.add(new BN(1)).toNumber()), "Auction does not exist.");
  });
});
