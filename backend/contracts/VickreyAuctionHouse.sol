// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;
//import "./TokenRepository.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract VickreyAuctionHouse {
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


    modifier contractIsTokenOwner(address _tokenRepositoryAddress, uint256 _tokenId) {
       address deedOwner = ERC721(_tokenRepositoryAddress).ownerOf(_tokenId);
        require(deedOwner == address(this), "Contract is not the owner of token");
        _;
    }

    event AuctionCreated(address beneficiary, uint256 auctionId);

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
     * @param _emissiondId uint256 of the deed registered in DeedRepository
     * @param _metadata string containing auction metadata
     * @return bool whether the auction is created
     */
    function createAuction(
        uint256 _emissiondId,
        address _tokenRepositoryAddress,
        string memory _metadata,
        uint256 _biddingEnd,
        uint256 _revealEnd
    )
        public
        contractIsTokenOwner(_tokenRepositoryAddress, _emissiondId)
        returns (
            //contractIsEmissionOwner(_tokenRepositoryAddress, _emissiondId)
            uint256
        )
    {
        uint256 auctionId = auctions.length;
        Auction memory newAuction;
        newAuction.tokenId = _emissiondId;
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
