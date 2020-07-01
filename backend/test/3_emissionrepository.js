var EmissionRepository = artifacts.require("./EmissionRepository.sol");
const fs = require("fs");
const truffleAssert = require("truffle-assertions");

contract("EmissionRepository", async (accounts) => {
  let instance;
  let auctionContractAddress = "";
  let emissionId = 123456789;
  let emissionType = "Carbondioxid";

  beforeEach("setup contract for each test", async function () {
    instance = await EmissionRepository.deployed();
    auctionContractAddress = fs
      .readFileSync("./test/output.address")
      .toString();
  });

  it("It should create an Emission repository with Carbondioxid as symbol", async () => {
    let symbol = await instance.symbol();
    assert.equal(
      symbol.valueOf(),
      "Carbondioxid",
      "Deedrepository symbol should be Carbondioxid"
    );
  });

  it("It should register a deed with id: 123456789", async () => {
    await instance.registerEmission(emissionId, emissionType, { from: accounts[0]});

    let tokenuri = await instance.tokenURI(emissionId);
    assert.equal(tokenuri.valueOf(), emissionType, "Result should be true");
  });

/*
  it("It should not register a deed with id: 123456789: lack of permissions", async () => {
    await instance.registerEmission(emissionId, emissionType);
    await truffleAssert.reverts(
        instance.registerEmission(emissionId, emissionType, { from: accounts[1]}),
        "Only the owner of the repository is allowed to add emissions"
    );
  });


  it("It should check owner of 123456789 who is ${accounts[0]}", async () => {
    let ownerOfDeed = await instance.ownerOf(deedId);
    assert.equal(
      ownerOfDeed.valueOf(),
      accounts[0],
      "Owner should be ${accounts[0]}"
    );
  });

  it("It should check balance of ${accounts[0]}", async () => {
    let balance = await instance.balanceOf(accounts[0]);
    assert.equal(balance.valueOf(), 1, "balance ${balance} should be 1");
  });

  it("It should check total supply of the repository", async () => {
    let supply = await instance.totalSupply();
    assert.equal(supply.valueOf(), 1, "total supply: ${supply} should be 1");
  });

  it("It should approve transfer the ownership of 123456789 to the auctionRepository address", async () => {
    await instance.approve(auctionContractAddress, deedId);
    let address = await instance.getApproved(deedId);
    assert.equal(
      address.valueOf(),
      auctionContractAddress,
      "${address} should be equal to ${auctionContractAddress}""
    );
  });

  it("It should transfer ownership of deed 123456789 to this contract", async () => {
    let oldOwnerAddress = await instance.ownerOf(deedId);
    let approvedAddress = await instance.getApproved(deedId);

    await instance.transferFrom(
      oldOwnerAddress,
      auctionContractAddress,
      deedId,
      { from: oldOwnerAddress }
    );
    let newOwnerAddress = await instance.ownerOf(deedId);
    assert.equal(
      newOwnerAddress.valueOf(),
      auctionContractAddress,
      "${newOwnerAddress} should be ${auctionContractAddress}"
    );
  });
  */
});
