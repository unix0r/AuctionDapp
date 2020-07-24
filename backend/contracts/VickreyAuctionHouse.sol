// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract VickreyAuctionHouse is IERC721Receiver {
    event ReceivedToken(
        address operator,
        address from,
        uint256 tokenId,
        bytes data,
        uint256 gas
    );

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes memory _data
    ) public override(IERC721Receiver) returns (bytes4 value) {
        previousOwner[_tokenId] = _from;
        emit ReceivedToken(
            _operator,
            _from,
            _tokenId,
            _data,
            gasleft() // msg.gas was deprecated in solidityv0.4.21
        );
        return 0x150b7a02;
    }

    Auction[] public auctions;
    struct Bid {
        address from;
        uint256 auctionId;
        bytes32 blindedBid;
        uint256 deposit;
    }

    struct Auction {
        uint256 tokenId;
        address tokenRepositoryAddress;
        string metadata;
        address beneficiary;
        bool active;
        bool finalized;
        uint256 biddingEnd;
        uint256 revealEnd;
        address highestBidder;
        uint256 highestBid;
        uint256 secondHighestBid;
    }

    modifier correctOwnerOfToken(address _creator, uint256 _tokenId) {
        require(
            _creator == previousOwner[_tokenId],
            "Not the correct previous owner of this token"
        );
        _;
    }

    modifier contractIsTokenOwner(
        address _tokenRepositoryAddress,
        uint256 _tokenId
    ) {
        address deedOwner = ERC721(_tokenRepositoryAddress).ownerOf(_tokenId);
        require(
            deedOwner == address(this),
            "Contract is not the owner of token"
        );
        _;
    }

    event AuctionCreated(address beneficiary, uint256 auctionId);

    mapping(uint256 => address) previousOwner;

    // Every Address refers to one bid
    mapping(address => Bid) bids;

    // Mapping auctionID to users Bids.
    mapping(uint256 => Bid[]) public auctionBids;

    // Mapping from owner to a list of owned auctions
    mapping(address => uint256[]) public auctionOwner;

    // Allowed withdrawals of previous bids
    mapping(address => uint256) pendingReturns;

    /**
     * @dev Creates an auction with the given informatin
     * @param _tokenRepositoryAddress address of the DeedRepository contract
     * @param _tokenId uint256 of the deed registered in DeedRepository
     * @param _metadata string containing auction metadata
     * @param _biddingEnd End of the bidding phase
     * @param _revealEnd End of the revealing phase
     * @return bool whether the auction is created
     */
    function createAuction(
        uint256 _tokenId,
        address _tokenRepositoryAddress,
        string memory _metadata,
        uint256 _biddingEnd,
        uint256 _revealEnd
    )
        public
        contractIsTokenOwner(_tokenRepositoryAddress, _tokenId)
        correctOwnerOfToken(msg.sender, _tokenId)
        returns (uint256)
    {
        uint256 auctionId = auctions.length;
        Auction memory newAuction;
        newAuction.tokenId = _tokenId;
        newAuction.tokenRepositoryAddress = _tokenRepositoryAddress;
        newAuction.metadata = _metadata;
        newAuction.beneficiary = msg.sender;
        newAuction.active = true;
        newAuction.finalized = false;
        newAuction.biddingEnd = _biddingEnd;
        newAuction.revealEnd = _revealEnd;
        auctions.push(newAuction);
        auctionOwner[msg.sender].push(auctionId);
        emit AuctionCreated(msg.sender, auctionId);
        return auctionId;
    }

    function getAuctionsCount() public view returns (uint256) {
        return auctions.length;
    }
}
