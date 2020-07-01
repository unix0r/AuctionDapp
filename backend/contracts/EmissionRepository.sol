pragma solidity ^0.4.18;
import "./ERC721/ERC721Token.sol";

/**
 * @title Repository of ERC721 Emissions
 * This contract contains the list of Emissions registered by users.
 * One Token represents the right to emit 1000kg carbondioxid per year.
 * to the repository.
 */
contract EmissionRepository is ERC721Token {

    //address payable public _owner;
    address public _owner;

    /**
    * @dev Created a EmissionRepository with a name and symbol
    * @param _name string represents the name of the repository
    * @param _symbol string represents the symbol of the repository
    */
    constructor(string _name, string _symbol) 
        public ERC721Token(_name, _symbol) {_owner = msg.sender;}
    
    /**
    * @dev Public function to register a new Emission
    * @dev Call the ERC721Token minter
    * @param _tokenId uint256 represents a specific Emission
    * @param _uri string containing metadata/uri
    */
    function registerEmission(uint256 _tokenId, string _uri) public {
        require(_owner == msg.sender, "Only the owner of the repository is allowed to add emissions");
        _mint(msg.sender, _tokenId);
        addEmissionMetadata(_tokenId, _uri);
        emit EmissionRegistered(msg.sender, _tokenId, _uri);
    }

    /**
    * @dev Public function to add metadata to a Emission
    * @param _tokenId represents a specific Emission
    * @param _uri text which describes the characteristics of a given Emission
    * @return whether the Emission metadata was added to the repository
    */
    function addEmissionMetadata(uint256 _tokenId, string _uri) public returns(bool){
        _setTokenURI(_tokenId, _uri);
        return true;
    }

    /**
    * @dev Event is triggered if Emission/token is registered
    * @param _by address of the registrar
    * @param _tokenId uint256 represents a specific Emission
    */
    event EmissionRegistered(address _by, uint256 _tokenId, string _uri);
}
