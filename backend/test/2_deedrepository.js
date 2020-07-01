var DeedRepository = artifacts.require("./DeedRepository.sol");
const fs = require("fs");

contract("DeedRepository", async (accounts) => {
  let instance;
  let auctionContractAddress = "";
  let deed_id = 123456789;
  let deed_url = "123456789";

  beforeEach("setup contract for each test", async function () {
    instance = await DeedRepository.deployed();
    auctionContractAddress = fs
      .readFileSync("./test/output.address")
      .toString();
  });

  it("It should create an deed repository with UANFT as symbol", async () => {
    let symbol = await instance.symbol();
    assert.equal(
      symbol.valueOf(),
      "UANFT",
      `Deedrepository symbol should be UANFT`
    );
  });

  it("It should register a deed with id: 123456789", async () => {
    await instance.registerDeed(deed_id, deed_url);
    let tokenuri = await instance.tokenURI(deed_id);
    assert.equal(tokenuri.valueOf(), deed_url, `Result should be true`);
  });

  it(`It should check owner of 123456789 who is ${accounts[0]}`, async () => {
    let ownerOfDeed = await instance.ownerOf(deed_id);
    assert.equal(
      ownerOfDeed.valueOf(),
      accounts[0],
      `Owner should be ${accounts[0]}`
    );
  });

  it(`It should check balance of ${accounts[0]}`, async () => {
    let balance = await instance.balanceOf(accounts[0]);
    assert.equal(balance.valueOf(), 1, `balance ${balance} should be 1`);
  });

  it(`It should check total supply of the repository`, async () => {
    let supply = await instance.totalSupply();
    assert.equal(supply.valueOf(), 1, `total supply: ${supply} should be 1`);
  });

  it(`It should approve transfer the ownership of 123456789 to the auctionRepository address`, async () => {
    await instance.approve(auctionContractAddress, deed_id);
    let address = await instance.getApproved(deed_id);
    assert.equal(
      address.valueOf(),
      auctionContractAddress,
      `${address} should be equal to ${auctionContractAddress}`
    );
  });

  it("It should transfer ownership of deed 123456789 to this contract", async () => {
    let oldOwnerAddress = await instance.ownerOf(deed_id);

    await instance.transferFrom(
      oldOwnerAddress,
      auctionContractAddress,
      deed_id,
      { from: oldOwnerAddress }
    );
    let newOwnerAddress = await instance.ownerOf(deed_id);
    assert.equal(
      newOwnerAddress.valueOf(),
      auctionContractAddress,
      `${newOwnerAddress} should be ${auctionContractAddress}`
    );
  });
});
