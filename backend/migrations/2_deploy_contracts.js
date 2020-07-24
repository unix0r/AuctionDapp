
var SecondPriceAuction = artifacts.require("./VickreyAuctionHouse.sol");
var TokenRepository = artifacts.require("./TokenRepository.sol");
module.exports = function(deployer) {
  //deployer.deploy(EnglishAuctionRepository);
  //deployer.deploy(DeedRepository, "Ultra Auction NFT", "UANFT");
  deployer.deploy(TokenRepository);
  deployer.deploy(SecondPriceAuction);
};
