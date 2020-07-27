var assert = require("assert");
var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./TokenRepository.sol");
const fs = require("fs");
const { soliditySha3 } = require("web3-utils");
const { expectRevert, time } = require("@openzeppelin/test-helpers");

contract("VickreyAuctionHouse", async (accounts) => {
  let tokenId1 = 1234567;

  let sealedBid;
  let auctionId0;

  let auctionHouse;
  let tokenRepo;

  function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  beforeEach("setup contract for each test", async function () {
    auctionHouse = await VickreyAuctionHouse.deployed();
    tokenRepo = await TokenRepository.deployed();
  });

  it("It should check if the auction repository is initialized", async () => {
    fs.writeFileSync("./test/output.address", auctionHouse.address);
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      `${auctionLength} auctions instead of 0`
    );
  });

  it("It should not create a new auction: Token does not exist.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId1,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "ERC721: owner query for nonexistent token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
  });

  it("It should not create a new auction: Token is not owned by Contract.", async () => {
    await tokenRepo.registerToken(accounts[0], tokenId1, {
      from: accounts[0],
    });
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId1,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "Contract is not the owner of token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
  });

  it("It should transfer the token to the smart contract.", async () => {
    let tokenOwner = await tokenRepo.ownerOf(tokenId1);
    assert.strictEqual(
      tokenOwner,
      accounts[0],
      "Creator is not the owner of token."
    );

    tokenRepo.safeTransferFrom(tokenOwner, auctionHouse.address, tokenId1, {
      from: tokenOwner,
    });
    tokenOwner = await tokenRepo.ownerOf(tokenId1);
    assert.strictEqual(
      tokenOwner,
      auctionHouse.address,
      "Contract is not the owner of token."
    );
  });

  it("It should not create a new auction: Not the correct previous owner of token.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
    let timestamp = new Date().getTime();

    await expectRevert(
      auctionHouse.createAuction(
        tokenId1,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        { from: accounts[1] }
      ),
      "Not the correct previous owner of this token"
    );

    //auctionId0 = result.logs[0].args[1].toNumber();
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 1"
    );
  });

  it("It should create a new auction.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      0,
      "Auction Count should be 0"
    );
    let timestamp = new Date().getTime();
    let result = await auctionHouse.createAuction(
      tokenId1,
      tokenRepo.address,
      "Selling One Token",
      timestamp + 10000,
      timestamp + 30000,
      { from: accounts[0] }
    );

    auctionId0 = result.logs[0].args[1].toNumber();

    auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      1,
      "Auction Count should be 1"
    );

    let auction = await auctionHouse.getAuctionById(auctionId0);
    assert.strictEqual(
      auction[0].toNumber(),
      tokenId1,
      "TokenID not correct in auction."
    );
    assert.strictEqual(
      auction[1],
      tokenRepo.address,
      "TokenRepo not correct in auction."
    );
    assert.strictEqual(
      auction[2],
      "Selling One Token",
      "TokenMetaData not correct in auction."
    );
    assert.strictEqual(
      auction[3],
      accounts[0],
      "Auction Owner not correct in auction."
    );
    assert.strictEqual(auction[4], true, "Auction is not active.");
    assert.strictEqual(auction[5], false, "Auction is finalized.");
    assert.strictEqual(
      auction[6].toNumber(),
      timestamp + 10000,
      "Auction biddingEnd not correct."
    );
    assert.strictEqual(
      auction[7].toNumber(),
      timestamp + 30000,
      "Auction revealEnd not correct."
    );
    assert.strictEqual(
      auction[8],
      "0x0000000000000000000000000000000000000000",
      "HighestBidder not correct in auction."
    );
    assert.strictEqual(
      auction[9].toNumber(),
      0,
      "HighestBid not correct in auction."
    );
    assert.strictEqual(
      auction[10].toNumber(),
      0,
      "SecondHighestBid not correct in auction."
    );
  });

  it("It should cancel an auction.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId);
    assert.strictEqual(auction[4], true, "Auction is not active.");
    assert.strictEqual(auction[5], false, "Auction is finalized.");
    await auctionHouse.cancelAuction(0);
    let tokenOwner = await tokenRepo.ownerOf(tokenId1);
    assert.strictEqual(
      tokenOwner,
      accounts[0],
      "Creator is not the owner of token."
    );
    auction = await auctionHouse.getAuctionById(auctionId);
    assert.strictEqual(auction[4], false, "Auction is active.");
    assert.strictEqual(auction[5], true, "Auction is not finalized.");
  });

  it("It should bid on an auction.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      1,
      "Auction Count should be 1"
    );
    tokenRepo.safeTransferFrom(accounts[0], auctionHouse.address, tokenId1, {
      from: accounts[0],
    });

    let timestamp = new Date().getTime();
    let result = await auctionHouse.createAuction(
      tokenId1,
      tokenRepo.address,
      "Selling One Token",
      timestamp + 10000,
      timestamp + 30000,
      { from: accounts[0] }
    );

    auctionId0 = result.logs[0].args[1].toNumber();
    let bidCount = await auctionHouse.getBidCount(auctionId0);
    assert.strictEqual(
      bidCount.toNumber(),
      0,
      `Wrong amount of bids: ${bidCount}.`
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.strictEqual(
      auctionLength.toNumber(),
      2,
      "Auction Count should be 1"
    );
    sealedBid= soliditySha3(
      { t: "uint", v: 1 },
      { t: "string", v: "01234" }
    );

    await auctionHouse.sealedBid(auctionId0, sealedBid, {
      from: accounts[1],
      value: 3,
    });

    sealedBid = soliditySha3({ t: "uint", v: 3 }, { t: "string", v: "0134" });

    await auctionHouse.sealedBid(auctionId0, sealedBid, {
      from: accounts[2],
      value: 5,
    });

    bidCount = await auctionHouse.getBidCount(auctionId0);
    assert.strictEqual(
      bidCount.toNumber(),
      2,
      `Wrong amount of bids: ${bidCount}.`
    );
  });

  it("It should not bid on own auction.", async () => {
    let bidCount = await auctionHouse.getBidCount(auctionId0);
    assert.strictEqual(
      bidCount.toNumber(),
      2,
      `Wrong amount of bids: ${bidCount}.`
    );

    sealedBid = soliditySha3({ t: "uint", v: 2 }, { t: "string", v: "34" });

    await expectRevert(
      auctionHouse.sealedBid(auctionId0, sealedBid, {
        from: accounts[0],
        value: 2,
      }),
      "The owner of an auction is not allowed to bid/reveal."
    );

    bidCount = await auctionHouse.getBidCount(auctionId0);
    assert.strictEqual(
      bidCount.toNumber(),
      2,
      `Wrong amount of bids: ${bidCount}.`
    );
  });

  it("It should not reveal bid, auction still running.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId0, 2, "34", { from: accounts[1] }),
      "Auction still running."
    );
  });

  it("It should not reveal bid, owner is not allowed to reveal.", async () => {
    await expectRevert(
      auctionHouse.reveal(auctionId0, 2, "34", { from: accounts[0] }),
      "The owner of an auction is not allowed to bid/reveal."
    );
  });

  it("it should end the bidding time.", async () => {
    let auction = await auctionHouse.getAuctionById(auctionId0);
    let timestamp = await time.latest();
    let timeleft = auction[6].toNumber() - timestamp;

    await time.increase(timeleft + 10);

    //timestamp = new Date().getTime();
    timestamp = await time.latest();
    auction = await auctionHouse.getAuctionById(auctionId0);
    timeleft = auction[6].toNumber() - timestamp;
  });

  it("It should reveal bids.", async () => {
    let refund = await auctionHouse.getRefund(accounts[1]);
    expect(refund.toNumber()).to.be.equal(0);

    await auctionHouse.reveal(auctionId0, 1, "01234", { from: accounts[1] });
    refund = await auctionHouse.getRefund(accounts[1]);
    expect(refund.toNumber()).to.be.equal(2);
    let auction = await auctionHouse.getAuctionById(auctionId0);
    expect(auction[8]).to.be.equal(accounts[1]);
    expect(auction[9].toNumber()).to.be.equal(1);

    auctionHouse.reveal(auctionId0, 3, "0134", { from: accounts[2] });

    refund = await auctionHouse.getRefund(accounts[1]);
    expect(refund.toNumber()).to.be.equal(3);

    auction = await auctionHouse.getAuctionById(auctionId0);
    refund = await auctionHouse.getRefund(accounts[1]);
    expect(auction[8]).to.be.equal(accounts[2]);
    expect(auction[9].toNumber()).to.be.equal(3);
    expect(auction[10].toNumber()).to.be.equal(1);
  });
});
