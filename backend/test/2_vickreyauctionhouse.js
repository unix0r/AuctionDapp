var assert = require("assert");
var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./TokenRepository.sol");
const fs = require("fs");
const truffleAssert = require("truffle-assertions");

contract("VickreyAuctionHouse", async (accounts) => {
  let tokenId1 = 1234567;
  let tokenId2 = 2345678;

  let auctionId0;
  let auctionId1;

  let auctionHouse;
  let tokenRepo;

  beforeEach("setup contract for each test", async function () {
    auctionHouse = await VickreyAuctionHouse.deployed();
    tokenRepo = await TokenRepository.deployed();
  });

  it("It should check if the auction repository is initialized", async () => {
    fs.writeFileSync("./test/output.address", auctionHouse.address);
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(
      auctionLength.valueOf(),
      0,
      `${auctionLength} auctions instead of 0`
    );
  });

  it("It should not create a new auction: Token does not exist.", async () => {
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 0, "Auction Count should be 0");
    let timestamp = new Date().getTime();

    await truffleAssert.reverts(
      auctionHouse.createAuction(
        tokenId1,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        {from: accounts[1]}
      ),
      "ERC721: owner query for nonexistent token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 0, "Auction Count should be 0");
  });

  it("It should not create a new auction: Token is not owned by Contract.", async () => {
    await tokenRepo.registerToken(accounts[0], tokenId1, {
      from: accounts[0],
    });
    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 0, "Auction Count should be 0");
    let timestamp = new Date().getTime();

    await truffleAssert.reverts(
      auctionHouse.createAuction(
        tokenId1,
        tokenRepo.address,
        "Selling One Token",
        timestamp + 10000,
        timestamp + 30000,
        {from: accounts[1]}
      ),
      "Contract is not the owner of token"
    );
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 0, "Auction Count should be 0");
  });

  /*
  it("It should create a new auction.", async () => {
    let tokenOwner = await tokenRepo.ownerOf(tokenId1);
    //console.log(tokenOwner1);

    tokenRepo.safeTransferFrom(tokenOwner, auctionHouse.address, tokenId1, {
      from: tokenOwner,
    });
    tokenOwner = await tokenRepo.ownerOf(tokenId1);
    assert.equal(tokenOwner, auctionHouse.address, "Contract is not the owner of token.");

    let auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 0, "Auction Count should be 0");
    let timestamp = new Date().getTime();
    result = await auctionHouse.createAuction(
      tokenId1,
      tokenRepo.address,
      "Selling One Token",
      timestamp + 10000,
      timestamp + 30000,
      {from: accounts[0]}
    );
    auctionId0 = result.logs[0].args[1].toNumber();
    auctionLength = await auctionHouse.getAuctionsCount();
    assert.equal(auctionLength, 1, "Auction Count should be 1");
  });
  */
});
