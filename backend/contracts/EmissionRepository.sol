// SPDX-License-Identifier: MIT
// @author Artur Dick
pragma solidity >=0.5.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EmissionRepository is ERC721 {
    /// @dev The creator of this Repository
    address _owner;

    /// @dev Constructor with name and symbol
    constructor(string memory _name, string memory _symbol ) public ERC721(_name, _symbol) {
        _owner = msg.sender;
    }

    /// @dev Register a new Emission Token
    /// @param _beneficiary The account to transfer the token to
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
