// SPDX-License-Identifier: MIT
// @author Artur Dick
pragma solidity >=0.5.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EmissionRepository is ERC721 {
    /// The creator of this Repository
    address _owner;

    /// @dev Constructor with name and symbol
    constructor() public ERC721("EmissionRight", "CO2") {
        _owner = msg.sender;
    }

    /// @dev Register a new Emission Token
    /// @param _benificiary The account to transfer the token to
    /// @param _emissionId The ID of the token
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
