// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;

//import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TokenRepository is ERC721 {
    address payable _owner;

    constructor() public ERC721("EmissionRight", "Carbondioxid") {
        _owner = msg.sender;
    }

    function registerToken(address _beneficiary, uint256 _tokenId)
        public
        returns (uint256)
    {
        require(msg.sender == _owner, "No Permission");
        require(_exists(_tokenId) == false, "Token already exists");
        _mint(_beneficiary, _tokenId);
        return _tokenId;
    }

    function exists(uint256 _tokenId) public view returns (bool) {
        return _exists(_tokenId);
    }
}
