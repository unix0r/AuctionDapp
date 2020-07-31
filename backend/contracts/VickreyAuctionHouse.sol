// SPDX-License-Identifier: MIT
// @author Artur Dick
pragma solidity >=0.5.0 <0.7.0;
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract VickreyAuctionHouse is IERC721Receiver {
    /**The event that is called, if the contract
    receives an Token.
     */
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
        emit ReceivedToken(_operator, _from, _tokenId, _data, gasleft());
        return 0x150b7a02;
    }

    Auction[] public auctions;
    struct Bid {
        address from;
        bytes32 blindedBid;
        uint256 deposit;
    }

    struct Auction {
        uint256 tokenId;
        address tokenRepositoryAddress;
        string metadata;
        address owner;
        bool active;
        bool finalized;
        uint256 biddingEnd;
        uint256 revealEnd;
        address highestBidder;
        uint256 highestBid;
        uint256 secondHighestBid;
    }
    modifier onlyBefore(uint256 _time) {
        require(block.timestamp < _time, "Auction is not running.");
        _;
    }
    modifier onlyAfter(uint256 _time) {
        require(block.timestamp > _time, "Auction still running.");
        _;
    }

    /**
     * @dev Guarantees msg.sender is owner of the given auction
     * @param _auctionId uint ID of the auction to validate its ownership belongs to msg.sender
     */
    modifier isOwner(uint256 _auctionId) {
        require(
            auctions[_auctionId].owner == msg.sender,
            "Not the correct owner of the auction"
        );
        _;
    }

    /**
     * @dev Guarantees msg.sender is owner of the given auction
     * @param _auctionId uint ID of the auction to validate its ownership belongs to msg.sender
     */
    modifier isNotOwner(uint256 _auctionId) {
        require(
            auctions[_auctionId].owner != msg.sender,
            "The owner of an auction is not allowed to bid/reveal."
        );
        _;
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
    event BidSuccess(uint256 _auctionId, address _from);
    event RevealSuccess(uint256 _auctionId, address _from);
    event AuctionCreated(uint256 auctionId, address _owner);
    event AuctionEnded(uint256 _auctionId, address _winner);
    event AuctioNCanceled(uint256 _auctionId);

    mapping(uint256 => address) previousOwner;

    // Every Address refers to one bid
    mapping(address => Bid) bids;

    // Mapping auctionID to users Bids.
    mapping(uint256 => Bid[]) public auctionBids;

    // Mapping from owner to a list of owned auctions
    mapping(address => uint256[]) public auctionOwner;

    // Allowed withdrawals of previous bids
    mapping(address => uint256) refunds;

    /**
     * @dev Gets an array of owned auctions
     * @param _owner address of the auction owner
     */
    function getAuctionsOf(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory ownedAuctions = auctionOwner[_owner];
        return ownedAuctions;
    }

    /**
     * @dev Gets the total number of auctions owned by an address
     * @param _owner address of the owner
     * @return uint total number of auctions
     */
    function getAuctionsCountOfOwner(address _owner)
        public
        view
        returns (uint256)
    {
        return auctionOwner[_owner].length;
    }

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
        newAuction.owner = msg.sender;
        newAuction.active = true;
        newAuction.finalized = false;
        newAuction.biddingEnd = _biddingEnd;
        newAuction.revealEnd = _revealEnd;
        auctions.push(newAuction);
        auctionOwner[msg.sender].push(auctionId);
        emit AuctionCreated(auctionId, msg.sender);
        return auctionId;
    }

    function getAuctionsCount() public view returns (uint256) {
        return auctions.length;
    }

    function approveAndTransfer(
        address _from,
        address _to,
        address _tokenRepositoryAddress,
        uint256 _deedId
    ) internal returns (bool) {
        ERC721 remoteContract = ERC721(_tokenRepositoryAddress);
        remoteContract.approve(_to, _deedId);
        remoteContract.transferFrom(_from, _to, _deedId);
        return true;
    }

    /**
     * @dev Gets the info of a given auction which are stored within a struct
     * @param _auctionId uint ID of the auction
     */
    function getAuctionById(uint256 _auctionId)
        public
        view
        returns (
            uint256 tokenId,
            address tokenRepositoryAddress,
            string memory metadata,
            address owner,
            bool active,
            bool finalized,
            uint256 biddingEnd,
            uint256 revealEnd,
            address highestBidder,
            uint256 highestBid,
            uint256 secondHighestBid
        )
    {
        Auction memory auc = auctions[_auctionId];
        return (
            auc.tokenId,
            auc.tokenRepositoryAddress,
            auc.metadata,
            auc.owner,
            auc.active,
            auc.finalized,
            auc.biddingEnd,
            auc.revealEnd,
            auc.highestBidder,
            auc.highestBid,
            auc.secondHighestBid
        );
    }

    /**
     * @dev Cancels an ongoing auction by the owner
     * @dev Token is transfered back to the auction owner
     * @dev Only if there are no bids.
     * @param _auctionId uint ID of the created auction
     */
    function cancelAuction(uint256 _auctionId) public isOwner(_auctionId) {
        require(
            auctions[_auctionId].active &&
                !auctions[_auctionId].finalized &&
                auctions[_auctionId].highestBidder == address(0) &&
                auctions[_auctionId].highestBid == 0 &&
                auctions[_auctionId].secondHighestBid == 0,
            "Auction is running"
        );

        auctions[_auctionId].active = false;
        auctions[_auctionId].finalized = true;
        approveAndTransfer(
            address(this),
            auctions[_auctionId].owner,
            auctions[_auctionId].tokenRepositoryAddress,
            auctions[_auctionId].tokenId
        );
    }

    /**
     * @dev Bidder sends bid on an auction
     * @dev Auction should be active and not ended
     * @dev Refund previous bidder if a new bid is valid and placed.
     * @param _auctionId uint ID of the created auction
     */
    function sealedBid(uint256 _auctionId, bytes32 _blindedBid)
        public
        payable
        onlyBefore(auctions[_auctionId].biddingEnd)
        isNotOwner(_auctionId)
    {
        auctionBids[_auctionId].push(
            Bid({from: msg.sender, blindedBid: _blindedBid, deposit: msg.value})
        );
        emit BidSuccess(_auctionId, msg.sender);
    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    function reveal(
        uint256 _auctionId,
        uint256 _value,
        string memory _secret
    )
        public
        isNotOwner(_auctionId)
        onlyAfter(auctions[_auctionId].biddingEnd)
        onlyBefore(auctions[_auctionId].revealEnd)
    {
        uint256 refund;
        Bid storage bid;
        for (uint256 i = 0; i < auctionBids[_auctionId].length; i++) {
            if (auctionBids[_auctionId][i].from == msg.sender) {
                bid = auctionBids[_auctionId][i];
            }
        }
        require(bid.from == msg.sender, "Revealer is not bidder.");
        require(bid.blindedBid != bytes32(0), "No blinded Bid.");
        // Bid was not actually revealed.
        // Do not refund deposit.
        require(
            bid.blindedBid == keccak256(abi.encodePacked(_value, _secret)),
            "Bid was not correctly revealed."
        );
        refund += bid.deposit;
        if (bid.deposit >= _value) {
            if (placeBid(_auctionId, msg.sender, _value)) refund -= _value;
        }
        emit RevealSuccess(_auctionId, msg.sender);
        bid.blindedBid = bytes32(0);
        refunds[msg.sender] += refund;
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function placeBid(
        uint256 _auctionId,
        address bidder,
        uint256 value
    ) internal returns (bool success) {
        if (value <= auctions[_auctionId].highestBid) {
            return false;
        }
        if (auctions[_auctionId].highestBidder != address(0)) {
            // Refund the previously highest bidder.
            refunds[auctions[_auctionId].highestBidder] += auctions[_auctionId]
                .highestBid;
        }
        if (auctions[_auctionId].secondHighestBid == 0) {
            auctions[_auctionId].secondHighestBid = value;
        } else {
            auctions[_auctionId].secondHighestBid = auctions[_auctionId]
                .highestBid;
        }
        auctions[_auctionId].highestBid = value;
        auctions[_auctionId].highestBidder = bidder;
        return true;
    }

    // Withdraw a bid that was overbid.
    function withdraw() public {
        uint256 amount = refunds[msg.sender];
        require(amount > 0, "No money to withdraw");
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns (see the remark above about
            // conditions -> effects -> interaction).
            refunds[msg.sender] = 0;
            msg.sender.transfer(amount);
        }
    }

    // End the auction and send the highest bid
    // to the beneficiary.
    function endAuction(uint256 _auctionId)
        public
        onlyAfter(auctions[_auctionId].revealEnd)
    {
        require(auctions[_auctionId].active, "Auction is already ended.");
        emit AuctionEnded(_auctionId, auctions[_auctionId].highestBidder);
        auctions[_auctionId].active = false;
        auctions[_auctionId].finalized = true;
        refunds[auctions[_auctionId].owner] += auctions[_auctionId]
            .secondHighestBid;
        refunds[auctions[_auctionId].highestBidder] +=
            auctions[_auctionId].highestBid -
            auctions[_auctionId].secondHighestBid;
        approveAndTransfer(
            address(this),
            auctions[_auctionId].highestBidder,
            auctions[_auctionId].tokenRepositoryAddress,
            auctions[_auctionId].tokenId
        );
    }

    function getRefund(address _bidder) public view returns (uint256) {
        return refunds[_bidder];
    }

    function getBidCount(uint256 _auctionId) public view returns (uint256) {
        return auctionBids[_auctionId].length;
    }
}
