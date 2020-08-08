
var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var EmissionRepository = artifacts.require("./EmissionRepository.sol");
module.exports = function(deployer) {
  deployer.deploy(EmissionRepository, "EmissionRight", "CO2");
  deployer.deploy(VickreyAuctionHouse);
};
