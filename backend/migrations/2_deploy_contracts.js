
var SecondPriceAuction = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./TokenRepository.sol");
module.exports = function(deployer) {
  deployer.deploy(TokenRepository);
  deployer.deploy(SecondPriceAuction);
};
