var EnglishAuctionRepository = artifacts.require("./EnglishAuctionRepository.sol");
var DeedRepository = artifacts.require("./DeedRepository.sol");
var EmissionRepository = artifacts.require("./EmissionRepository.sol");
// DeedRepository => 0xbb55adc67f64d1e6f08ba7523ecd2eca2ee434a3
module.exports = function(deployer) {
  deployer.deploy(EnglishAuctionRepository);
  deployer.deploy(DeedRepository, "Ultra Auction NFT", "UANFT");
  deployer.deploy(EmissionRepository, "EmissionTrader", "Carbondioxid")
};
