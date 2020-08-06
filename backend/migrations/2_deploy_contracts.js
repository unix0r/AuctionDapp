
var VickreyAuctionHouse = artifacts.require("./VickreyAuctionHouse.sol");
var EmissionRepository = artifacts.require("./EmissionRepository.sol");
module.exports = function(deployer) {
  deployer.deploy(EmissionRepository);
  deployer.deploy(VickreyAuctionHouse);
};
