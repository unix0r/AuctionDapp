var EnglishAuctionRepository = artifacts.require("./EnglishAuctionRepository.sol");
var DeedRepository = artifacts.require("./DeedRepository.sol");
const fs = require("fs");

contract("EnglishAuctionRepository", async (accounts) => {
  let deed_id = 123456789;
  let deed_url = "123456789";

  it("It should check if the auction repository is initialized", async () => {
    let instance = await EnglishAuctionRepository.deployed();
    fs.writeFileSync("./test/output.address", instance.address);
    let auctionLength = await instance.getCount();
    assert.equal(
      auctionLength.valueOf(),
      0,
      `${auctionLength} auctions instead of 0`
    );
  });

  it("It should approve transfer of ownership of the 123456789 token", async () => {
    let instance = await DeedRepository.deployed();
    await instance.registerDeed(deed_id, deed_url);
    let auctionInstance = await EnglishAuctionRepository.deployed();
    let auctionAddress = auctionInstance.address;
    await instance.approve(auctionAddress, deed_id);

    let address = await instance.getApproved(deed_id);
    assert.equal(
      address.valueOf(),
      auctionAddress,
      `${address} should be equal to ${auctionAddress}`
    );
  });

  it("It should transfer ownership of deed to this contract", async () => {
    let instance = await DeedRepository.deployed();
    let auctionInstance = await EnglishAuctionRepository.deployed();
    let auctionAddress = auctionInstance.address;
    await instance.transferFrom(accounts[0], auctionAddress, deed_id, {
      from: accounts[0],
    });
    let newOwnerAddress = await instance.ownerOf(deed_id);
    assert.equal(
      newOwnerAddress.valueOf(),
      auctionAddress,
      `${newOwnerAddress} should be ${auctionAddress}`
    );
  });

  it(`It should create an auction under ${accounts[0]} account`, async () => {
    let deedInstance = await DeedRepository.deployed();
    let auctionInstance = await EnglishAuctionRepository.deployed();
    let timestamp = new Date().getTime();
    await auctionInstance.createAuction(
      deedInstance.address,
      deed_id,
      "MYNFT",
      "meta://",
      10,
      timestamp + 1000
    );
    let auctionCount = await auctionInstance.getAuctionsCountOfOwner(
      accounts[0]
    );
    assert.equal(
      auctionCount.valueOf(),
      1,
      `auctions of ${accounts[0]} should be 1`
    );
  });

  it(`It should bid on the last auction`, async () => {
    let instance = await EnglishAuctionRepository.deployed();
    let bidsCountBeforeBid = await instance.getBidsCount(0);
    await instance.bidOnAuction(0, { from: accounts[1], value: 100 });
    await instance.bidOnAuction(0, { from: accounts[2], value: 110 });
    let bidsCountAfterBid = await instance.getBidsCount(0);
    assert.equal(
      bidsCountAfterBid.valueOf().toNumber(),
      bidsCountBeforeBid.valueOf().toNumber() + 2,
      `bids should be 1`
    );
    let highestBid = await instance.getCurrentBid(0);
    assert.equal(
      highestBid[0].toNumber(),
      110,
      `highest bid should be 110`
    );
  });
});
