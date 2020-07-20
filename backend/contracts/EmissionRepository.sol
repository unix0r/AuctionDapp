pragma solidity >=0.5.0 <0.7.0;

//import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract EmissionRepository is ERC721 {
    address payable _owner;
    
    constructor() ERC721("EmissionRight", "Carbondioxid") public {
        _owner = msg.sender;
    }

    function registerEmission(address beneficiary, uint256 tokenid) public returns (uint256) {
        require(msg.sender == _owner, "No Permission");
        _mint(beneficiary, tokenid);
        return tokenid;
    }
}

