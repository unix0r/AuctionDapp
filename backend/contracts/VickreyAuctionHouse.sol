// SPDX-License-Identifier: MIT
// @author Artur Dick  <artur.dick[at]mailbox.org>

pragma solidity >=0.5.0 <0.7.0;

/// Import ERC721 Interfaces of the openzeppelin project
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// The Smart Contract for the simultaneous second price auction (Vickrey Auction)
contract VickreyAuctionHouse is IERC721Receiver {
    // Struct containing information about a sealed bid
    struct Bid {
        address from;
        bytes32 blindedBid;
        uint256 deposit;
    }

    // Struct containing information about an auction
    struct Auction {
        uint256 tokenId;
        address tokenRepositoryAddress;
        string metadata;
        address owner;
        bool active;
        uint256 biddingEnd;
        uint256 revealEnd;
        address highestBidder;
        uint256 highestBid;
        uint256 secondHighestBid;
    }

    //Array for all auctions
    Auction[] public auctions;

    // Mapping auctionID to users Bids
    mapping(uint256 => Bid[]) public auctionBids;

    // Mapping TokenID to previous Owner
    mapping(uint256 => address) previousOwner;

    // Mapping from user to a list of auctions
    mapping(address => uint256[]) public auctionOwner;

    // Allowed withdrawals
    mapping(address => uint256) refunds;

    /// @dev Guarantees an active auction
    /// @param _auctionId given auction.
    modifier isActive(uint256 _auctionId) {
        require(
            auctions[_auctionId].active == true,
            "The auction is not active."
        );
        _;
    }

    /// @dev Guarantees current time is before _time
    /// @param _time Time to be checked
    modifier onlyBefore(uint256 _time) {
        require(block.timestamp < _time, "Auction is not running.");
        _;
    }

    /// @dev Guarantees current time is after _time
    /// @param _time Time to be checked
    modifier onlyAfter(uint256 _time) {
        require(block.timestamp > _time, "Auction still running.");
        _;
    }

    /// @dev Guarantees msg.sender is owner of the given auction
    /// @param _auctionId uint ID of the auction to validate its ownership belongs to msg.sender
    modifier isOwner(uint256 _auctionId) {
        require(
            auctions[_auctionId].owner == msg.sender,
            "Not the correct owner of the auction."
        );
        _;
    }

    /// @dev Guarantees msg.sender is not owner of the given auction
    /// @param _auctionId uint ID of the auction to validate its ownership belongs not to msg.sender
    modifier isNotOwner(uint256 _auctionId) {
        require(
            auctions[_auctionId].owner != msg.sender,
            "The owner of an auction is not allowed to bid/reveal."
        );
        _;
    }

    /// @dev Guarantees msg.sender did not already bid on given auction
    /// @param _auctionId The auction to be checked
    modifier didNotBid(uint256 _auctionId) {
        for (uint256 i = 0; i < auctionBids[_auctionId].length; i++) {
            require(
                auctionBids[_auctionId][i].from != msg.sender,
                "User has already bid on this auction."
            );
        }
        _;
    }

    /// @dev Guarantees that the _creator was the old owner of _tokenId
    /// @param _creator Address of the old owner
    /// @param _tokenId TokenID
    modifier correctOwnerOfToken(address _creator, uint256 _tokenId) {
        require(
            _creator == previousOwner[_tokenId],
            "Not the correct previous owner of this token."
        );
        _;
    }

    /// @dev Guarantees that this contract is the owner of a token
    /// @param _tokenRepositoryAddress The Repository of the Token
    /// @param _tokenId The TokenID
    modifier contractIsTokenOwner(
        address _tokenRepositoryAddress,
        uint256 _tokenId
    ) {
        address deedOwner = ERC721(_tokenRepositoryAddress).ownerOf(_tokenId);
        require(
            deedOwner == address(this),
            "Contract is not the owner of token."
        );
        _;
    }

    /// @dev Bid was successfull
    /// @param _auctionId The auction
    /// @param _from The bidder
    event BidSuccess(uint256 _auctionId, address _from);

    /// @dev The bid was successfully revealed
    /// @param _auctionId The auction
    /// @param _from The bidder
    event RevealedBid(uint256 _auctionId, address _from);

    /// @dev Auction was created
    /// @param _auctionId The auction
    /// @param _owner The owner of the auction
    event AuctionCreated(uint256 _auctionId, address _owner);

    /// @dev The auction was ended
    /// @param _auctionId The auction
    /// @param _winner The winning bidder
    event AuctionEnded(uint256 _auctionId, address _winner);

    /// @dev Auction was canceled
    /// @param _auctionId The auction
    event AuctionCanceled(uint256 _auctionId);

    /// @dev The Bid Time is over
    /// @param _auctionId The auction
    event BidTimeOver(uint256 _auctionId);

    /// @dev The Reveal Time is over
    /// @param _auctionId The auction
    event RevealTimeOver(uint256 _auctionId);

    /// @dev The contract received a token
    event ReceivedToken(
        address operator,
        address from,
        uint256 tokenId,
        bytes data,
        uint256 gas
    );

    /// @dev Implentation of the Interface function to receive ERC721 Tokens
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes memory _data
    ) public override(IERC721Receiver) returns (bytes4 value) {
        previousOwner[_tokenId] = _from;
        emit ReceivedToken(_operator, _from, _tokenId, _data, gasleft());
        return 0x150b7a02; //Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    }

    /// @dev Creates an auction with the given information
    /// @param _tokenId uint256 of the deed registered in DeedRepository
    /// @param _tokenRepositoryAddress address of the DeedRepository contract
    /// @param _metadata string containing auction metadata
    /// @param _biddingEnd End of the bidding phase
    /// @param _revealEnd End of the revealing phase
    /// @return uint256 The ID of the created auction
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
        require(
            _biddingEnd > block.timestamp,
            "Bidding Time is alreay finished."
        );
        require(
            _revealEnd > _biddingEnd,
            "Reveal Time must end after Bidding Time."
        );
        uint256 auctionId = auctions.length;
        Auction memory newAuction;
        newAuction.tokenId = _tokenId;
        newAuction.tokenRepositoryAddress = _tokenRepositoryAddress;
        newAuction.metadata = _metadata;
        newAuction.owner = msg.sender;
        newAuction.active = true;
        newAuction.biddingEnd = _biddingEnd;
        newAuction.revealEnd = _revealEnd;
        auctions.push(newAuction);
        auctionOwner[msg.sender].push(auctionId);
        emit AuctionCreated(auctionId, msg.sender);
        return auctionId;
    }

    /// @dev Returns the amount of auctions
    /// @return uint256, the length of the auction array
    function getAuctionsCount() public view returns (uint256) {
        return auctions.length;
    }

    /// @dev internal function to move the token to another user
    /// @param _from The source address of the token
    /// @param _to The destination address of the token
    /// @param _tokenRepositoryAddress The Repository Address of the Token
    /// @param _tokenId The ID of the token.
    function approveAndTransfer(
        address _from,
        address _to,
        address _tokenRepositoryAddress,
        uint256 _tokenId
    ) internal {
        ERC721 remoteContract = ERC721(_tokenRepositoryAddress);
        remoteContract.approve(_to, _tokenId);
        remoteContract.transferFrom(_from, _to, _tokenId);
    }

    /// @dev Returns the information of an auction
    /// @param _auctionId ID of the auction
    /// @return tokenId ID of the Token
    /// @return tokenRepositoryAddress The Repository Address of the Token
    /// @return metadata Metadata of the auction
    /// @return owner The address of the owner/seller
    /// @return active Boolean flag for the status of the auction
    /// @return biddingEnd The end of the bidding time period
    /// @return revealEnd The end of the reveal time period
    /// @return highestBidder The address of the current highest Bidder
    /// @return highestBid The Bid of the highest Bidder
    /// @return secondHighestBid The second highest Bid
    function getAuctionById(uint256 _auctionId)
        public
        view
        returns (
            uint256 tokenId,
            address tokenRepositoryAddress,
            string memory metadata,
            address owner,
            bool active,
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
            auc.biddingEnd,
            auc.revealEnd,
            auc.highestBidder,
            auc.highestBid,
            auc.secondHighestBid
        );
    }

    /// @dev Cancels an auction, if its alive and there are no bidders.
    /// @param _auctionId The ID of the auction.
    function cancelAuction(uint256 _auctionId) public isOwner(_auctionId) {
        require(auctions[_auctionId].active == true, "Auction is not alive.");
        require(
            auctionBids[_auctionId].length == 0,
            "There are already bids in this auction."
        );
        require(
            auctions[_auctionId].highestBidder == address(0) &&
                auctions[_auctionId].highestBid == 0 &&
                auctions[_auctionId].secondHighestBid == 0,
            "There are already bids in this auction."
        );

        auctions[_auctionId].active = false;
        approveAndTransfer(
            address(this),
            auctions[_auctionId].owner,
            auctions[_auctionId].tokenRepositoryAddress,
            auctions[_auctionId].tokenId
        );
    }

    /// @dev Sending an encrypted, sealed Bid for an auction
    /// @dev Payable: the bidders are sending a deposit with their secret bid
    /// @param _auctionId The ID of the auction
    /// @param _blindedBid The encrypted Bid containing the value and secret
    function sealedBid(uint256 _auctionId, bytes32 _blindedBid)
        public
        payable
        onlyBefore(auctions[_auctionId].biddingEnd)
        didNotBid(_auctionId)
        isNotOwner(_auctionId)
        isActive(_auctionId)
    {
        auctionBids[_auctionId].push(
            Bid({from: msg.sender, blindedBid: _blindedBid, deposit: msg.value})
        );
        emit BidSuccess(_auctionId, msg.sender);
    }

    /// @dev Reveal a blinded Bid, the difference to the deposit is added to a refund
    /// @dev The deposit is locked if the bidder wont reveeal the bid.
    /// @param _auctionId The ID of the auction
    /// @param _value The value of the Bid
    /// @param _secret The secret of the encrypted Bid
    function reveal(
        uint256 _auctionId,
        uint256 _value,
        string memory _secret
    )
        public
        isNotOwner(_auctionId)
        onlyAfter(auctions[_auctionId].biddingEnd)
        onlyBefore(auctions[_auctionId].revealEnd)
        isActive(_auctionId)
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
        emit RevealedBid(_auctionId, msg.sender);
        bid.blindedBid = bytes32(0);
        refunds[msg.sender] += refund;
    }

    /// @dev Internal function to check correct revealed bids
    /// @param _auctionId The ID of the auction
    /// @param _bidder The address of the bidder
    /// @param _value The bid of the bidder
    /// @return success If the deposit was high enough for the bid
    function placeBid(
        uint256 _auctionId,
        address _bidder,
        uint256 _value
    ) internal returns (bool success) {
        if (_value <= auctions[_auctionId].highestBid) {
            return false;
        }
        if (auctions[_auctionId].highestBidder != address(0)) {
            // Refund the previously highest bidder.
            refunds[auctions[_auctionId].highestBidder] += auctions[_auctionId]
                .highestBid;
        }
        if (auctions[_auctionId].secondHighestBid == 0) {
            auctions[_auctionId].secondHighestBid = _value;
        } else {
            auctions[_auctionId].secondHighestBid = auctions[_auctionId]
                .highestBid;
        }
        auctions[_auctionId].highestBid = _value;
        auctions[_auctionId].highestBidder = _bidder;
        return true;
    }

    /// @dev Withdraw a refund or the revenue
    function withdraw() public {
        uint256 amount = refunds[msg.sender];
        require(amount > 0, "No money to withdraw.");
        if (amount > 0) {
            // Important to set this to zero.
            refunds[msg.sender] = 0;
            msg.sender.transfer(amount);
        }
    }

    /// @dev End an auction
    /// @dev Transfers the token to the highest Bidder or back to the seller
    /// @dev Transfers the difference between the highest and second Highest Bid to the seller
    /// @param _auctionId The ID of the auction
    function endAuction(uint256 _auctionId)
        public
        onlyAfter(auctions[_auctionId].revealEnd)
        isActive(_auctionId)
    {
        emit AuctionEnded(_auctionId, auctions[_auctionId].highestBidder);
        auctions[_auctionId].active = false;
        if (auctions[_auctionId].highestBidder == address(0)) {
            approveAndTransfer(
                address(this),
                auctions[_auctionId].owner,
                auctions[_auctionId].tokenRepositoryAddress,
                auctions[_auctionId].tokenId
            );
        } else {
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
    }

    /// @dev The owner of the auction can trigger an event, that the bid time period is over
    /// @dev The Bidders are informed about the end of this time period
    /// @param _auctionId The ID of the auction
    function endBidTime(uint256 _auctionId)
        public
        onlyAfter(auctions[_auctionId].biddingEnd)
        onlyBefore(auctions[_auctionId].revealEnd)
        isActive(_auctionId)
    {
        emit BidTimeOver(_auctionId);
    }

    /// @dev The owner of the auction can trigger an event, that the reveal time period is over
    /// @dev The Bidders are informed about the end of this time period
    /// @param _auctionId The ID of the auction
    function endRevealTime(uint256 _auctionId)
        public
        onlyAfter(auctions[_auctionId].biddingEnd)
        onlyAfter(auctions[_auctionId].revealEnd)
        isActive(_auctionId)
    {
        emit RevealTimeOver(_auctionId);
    }

    /// @dev Gets the refund of an address
    /// @param _bidder The address to be checked
    /// @return The amount of refund of this address
    function getRefund(address _bidder) public view returns (uint256) {
        return refunds[_bidder];
    }

    /// @dev Gets the current amount of blindedBids of this auction
    /// @param _auctionId The ID of the auction
    /// @return The amount of blinded bids in this auction
    function getBidCount(uint256 _auctionId) public view returns (uint256) {
        return auctionBids[_auctionId].length;
    }
}
