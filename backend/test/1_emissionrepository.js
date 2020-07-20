var assert = require('assert');
var EmissionRepository = artifacts.require("./EmissionRepository.sol");
const fs = require("fs");
const truffleAssert = require("truffle-assertions");
const PREFIX = "VM Exception while processing transaction: ";
contract("EmissionRepository", async (accounts) => {
  let instance;
  let auctionContractAddress = "";
  let emissionId1 = 123456789;
  let emissionId2 = 2345678;
  let emissionType = "Carbondioxid";

  beforeEach("setup contract for each test", async function () {
    instance = await EmissionRepository.deployed();
    //auctionContractAddress = fs
    //  .readFileSync("./test/output.address")
    //  .toString();
  });


  it("It should create an Emission repository with Carbondioxid as symbol", async () => {
    let symbol = await instance.symbol();
    assert.equal(
      symbol.valueOf(),
      emissionType,
      "Deedrepository symbol should be Carbondioxid"
    );
  });

  it("It should register a EmissionToken and give it to a account", async () => {
    let balanceOfOwner = await instance.balanceOf(accounts[0]);
    assert.equal(balanceOfOwner, 0, "Wrong amount of Tokens for owner");
    await instance.registerEmission(accounts[0], emissionId1, {
      from: accounts[0],
    });
    //await truffleAssert.reverts(instance.tokenURI(emissionId2), "ERC721Metadata: URI query for nonexistent token");
    let ownerOfToken = await instance.ownerOf(emissionId1);
    balanceOfOwner = await instance.balanceOf(accounts[0]);
    assert.equal(ownerOfToken, accounts[0], "Wrong owner of created Token");
    assert.equal(balanceOfOwner, 1, "Wrong amount of Tokens for owner");
  });

  it("The creator of the token should be the creator of the repo", async () => {
    let symbol = await instance.symbol();
    //console.log(symbol);
    //console.log(instance._owner);

    assert.equal(
      symbol.valueOf(),
      emissionType,
      "Deedrepository symbol should be Carbondioxid"
    );
  });

  it("It should not get Information of non existent Token", async () => {
    await truffleAssert.reverts(
      instance.tokenURI(emissionId2),
      "ERC721Metadata: URI query for nonexistent token"
    );
  });

  it("It should not register a EmissionToken: Already existing", async () => {
    await truffleAssert.reverts(
      instance.registerEmission(accounts[0], emissionId1, {
        from: accounts[0],
      }),
      "token already minted"
    );
  });

  it("It should not register a EmissionToken: lack of permissions", async () => {
    let balanceOfOwner = await instance.balanceOf(accounts[1]);
    assert.equal(balanceOfOwner, 0, "Wrong amount of Tokens for owner");

    await truffleAssert.reverts(
      instance.registerEmission(accounts[1], emissionId2, {
        from: accounts[1],
      }),
      "No Permission"
    );
    balanceOfOwner = await instance.balanceOf(accounts[1]);
    assert.equal(balanceOfOwner, 0, "Wrong amount of Tokens for owner");
  });

  it("It should not transfer an token to another account: lack of permissions", async () => {
    let tokenOwner1 = await instance.ownerOf(emissionId1);
    let balanceOfOwner1 = await instance.balanceOf(tokenOwner1);
    let tokenOwner2 = accounts[2];
    let balanceOfOwner2 = await instance.balanceOf(tokenOwner2);

    assert.equal(tokenOwner1, accounts[0], "Wrong owner of created Token");
    assert.equal(balanceOfOwner1, 1, "Wrong amount of Tokens for owner");
    assert.equal(tokenOwner2, accounts[2], "Wrong owner of created Token");
    assert.equal(balanceOfOwner2, 0, "Wrong amount of Tokens for owner");

    await truffleAssert.reverts(
      instance.safeTransferFrom(tokenOwner1, tokenOwner2, emissionId1, {from: accounts[1]}),
      "ERC721: transfer caller is not owner nor approved"
    );

    assert.equal(tokenOwner1, accounts[0], "Wrong owner of created Token");
    assert.equal(balanceOfOwner1, 1, "Wrong amount of Tokens for owner");
    assert.equal(tokenOwner2, accounts[2], "Wrong owner of created Token");
    assert.equal(balanceOfOwner2, 0, "Wrong amount of Tokens for owner");

  });

  it("It should transfer an token to another address", async () => {
    let tokenOwner1 = await instance.ownerOf(emissionId1);
    let balanceOfOwner1 = await instance.balanceOf(tokenOwner1);
    let tokenOwner2 = accounts[2];
    let balanceOfOwner2 = await instance.balanceOf(tokenOwner2);

    assert.equal(tokenOwner1, accounts[0], "Wrong owner of created Token");
    assert.equal(balanceOfOwner1, 1, "Wrong amount of Tokens for owner");
    assert.equal(tokenOwner2, accounts[2], "Wrong owner of created Token");
    assert.equal(balanceOfOwner2, 0, "Wrong amount of Tokens for owner");

    await instance.safeTransferFrom(tokenOwner1, tokenOwner2, emissionId1, {from: tokenOwner1});

    let newTokenOwner = await instance.ownerOf(emissionId1);
    balanceOfOwner1 = await instance.balanceOf(tokenOwner1);
    balanceOfOwner2 = await instance.balanceOf(tokenOwner2);

    assert.equal(newTokenOwner, tokenOwner2, "Wrong owner of created Token");
    assert.equal(balanceOfOwner1, 0, "Wrong amount of Tokens for owner");
    assert.equal(balanceOfOwner2, 1, "Wrong amount of Tokens for owner");

  });

  /*

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
