// SPDX-License-Identifier: MIT
// @author Artur Dick
pragma solidity >=0.5.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EmissionRepository is ERC721 {
    address _owner;

    constructor() public ERC721("EmissionRight", "Carbondioxid") {
        _owner = msg.sender;
    }

    function registerEmission(address _beneficiary, uint256 _emissionId)
        public
        returns (uint256)
    {
        require(msg.sender == _owner, "No Permission");
        require(_exists(_emissionId) == false, "Emission Token already exists");
        _mint(_beneficiary, _emissionId);
        return _emissionId;
    }
}
