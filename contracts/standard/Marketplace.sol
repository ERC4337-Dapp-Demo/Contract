// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IMarketplace.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../interfaces/ICurrency.sol";

contract Marketplace is
    Ownable,
    IMarketplace,
    ReentrancyGuard,
    ERC721Holder,
    ERC1155Receiver,
    ERC1155Holder
{
    uint256 public FEE_PER_ITEM; // 10%
    uint256 public MAX_PERCENTAGE;
    address public treasuryAddress;
    address private _currencyAddress;

    enum ItemState {
        LIST,
        UNLIST
    }

    enum ContractType {
        ERC721,
        ERC1155
    }

    struct Item {
        address owner;
        uint256 amount;
        address contractERC20;
        uint256 price;
        ContractType contractType;
        ItemState state;
    }

    mapping(address => mapping(uint256 => Item[])) public itemStore;

    event ListingItem(
        uint256 marketId,
        address from,
        address to,
        uint256 quantity,
        address contractNFT,
        uint256 tokenId,
        address contractERC20,
        uint256 price
    );

    event ListingBulkItem(
        uint256 marketId,
        address from,
        address to,
        uint256 quantity,
        address contractNFT,
        uint256 tokenId,
        address contractERC20,
        uint256 price
    );

    event SaleItem(
        uint256 marketId,
        address from,
        address to,
        uint256 quantity,
        address contractNFT,
        uint256 tokenId,
        address contractERC20,
        uint256 price
    );
    event CancelListing(
        uint256 marketId,
        address from,
        address to,
        uint256 quantity,
        address contractNFT,
        uint256 tokenId,
        address contractERC20,
        uint256 price
    );
    event UpdatePriceItem(
        uint256 marketId,
        address from,
        address to,
        uint256 quantity,
        address contractNFT,
        uint256 tokenId,
        address contractERC20,
        uint256 price
    );

    constructor() {
        treasuryAddress = _msgSender();
        FEE_PER_ITEM = 300; // 3%
        MAX_PERCENTAGE = 10000;
    }

    fallback() external payable {}

    function setTreasuryAddress(address _address) external onlyOwner {
        treasuryAddress = _address;
    }

    function setCurrencyAddress(address _address) external onlyOwner {
        _currencyAddress = _address;
    }

    function setFee(uint256 _fee) external onlyOwner {
        FEE_PER_ITEM = _fee;
    }

    /**
    @dev Approve ERC721 to this contract
     */
    function listItem(
        address _contractNFT,
        uint256 _tokenId,
        address _contractERC20,
        uint256 _price
    ) external override(IMarketplace) {
        _listItem(_contractNFT, _tokenId, _contractERC20, _price);
    }

    /**
    @dev Approve ERC1155 to this contract
     */
    function listBulkItems(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _amount,
        address _contractERC20,
        uint256 _price
    ) external override(IMarketplace) {
        _listBulkItems(_contractNFT, _tokenId, _amount, _contractERC20, _price);
    }

    function cancelItem(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId
    ) external override(IMarketplace) nonReentrant {
        Item storage myItem = itemStore[_contractNFT][_tokenId][_storeId];
        require(myItem.owner == _msgSender(), "Marketplace: You are not owner");
        require(
            myItem.state == ItemState.LIST,
            "Marketplace: Item has been canceled"
        );
        myItem.state = ItemState.UNLIST;

        if (_is721(_contractNFT)) {
            _transferERC721(
                _contractNFT,
                _tokenId,
                address(this),
                myItem.owner
            );
        } else if (_is1155(_contractNFT)) {
            _transferERC1155(
                _contractNFT,
                _tokenId,
                myItem.amount,
                address(this),
                myItem.owner
            );
        }

        emit CancelListing(
            _storeId,
            _msgSender(),
            address(this),
            myItem.amount,
            _contractNFT,
            _tokenId,
            myItem.contractERC20,
            myItem.price
        );
    }

    function updatePriceItem(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId,
        uint256 _price
    ) external override(IMarketplace) nonReentrant {
        Item storage item = itemStore[_contractNFT][_tokenId][_storeId];
        require(
            item.state == ItemState.LIST,
            "Marketplace: Item is not listing!"
        );
        require(item.owner == _msgSender(), "Marketplace: You are not owner!");
        item.price = _price;
        emit UpdatePriceItem(
            _storeId,
            _msgSender(),
            address(this),
            item.amount,
            _contractNFT,
            _tokenId,
            item.contractERC20,
            _price
        );
    }

    function buyItem(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId,
        uint256 _amount
    ) external payable override(IMarketplace) nonReentrant {
        Item memory myItem = itemStore[_contractNFT][_tokenId][_storeId];

        _buyItem(_contractNFT, _tokenId, _storeId, _amount);
        _transferToken(_contractNFT, _tokenId, _storeId, _amount);

        emit SaleItem(
            _storeId,
            myItem.owner,
            _msgSender(),
            _amount,
            _contractNFT,
            _tokenId,
            myItem.contractERC20,
            myItem.price
        );
    }

    function _buyItem(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId,
        uint256 _amount
    ) private {
        Item memory myItem = itemStore[_contractNFT][_tokenId][_storeId];
        require(_amount <= myItem.amount, "Marketplace: Overamount of nfts");
        require(
            myItem.state == ItemState.LIST,
            "Marketplace: Item is not listing!"
        );
        uint256 minAllowance = (_amount *
            myItem.price *
            (MAX_PERCENTAGE + FEE_PER_ITEM)) / MAX_PERCENTAGE;
        uint256 ownerAmount = _amount * myItem.price;
        uint256 treasuryAmount = minAllowance - _amount * myItem.price;

        if (myItem.contractERC20 == address(0)) {
            require(msg.value >= minAllowance, "Marketplace: Not enough WETH");
            (bool successOwner, ) = payable(myItem.owner).call{
                value: ownerAmount
            }("");
            require(successOwner, "Marketplace: can not transfer to owner");

            (bool successTreasury, ) = payable(treasuryAddress).call{
                value: treasuryAmount
            }("");
            require(
                successTreasury,
                "Marketplace: can not transfer to treasury"
            );
        } else {
            uint256 allowance = IERC20(myItem.contractERC20).allowance(
                _msgSender(),
                address(this)
            );
            require(
                allowance >= minAllowance,
                "Marketplace: Not enough allowance"
            );
            // transfer 90% to owner
            bool successOwner = IERC20(myItem.contractERC20).transferFrom(
                _msgSender(),
                myItem.owner,
                ownerAmount
            );
            require(successOwner, "Marketplace: can not transfer to owner");

            // Transfer 10% to treasury address
            bool successTreasury = IERC20(myItem.contractERC20).transferFrom(
                _msgSender(),
                treasuryAddress,
                treasuryAmount
            );
            require(
                successTreasury,
                "Marketplace: can not transfer to treasury"
            );
        }
    }

    function _transferToken(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId,
        uint256 _amount
    ) private {
        Item storage item = itemStore[_contractNFT][_tokenId][_storeId];
        if (item.contractType == ContractType.ERC721) {
            _transferERC721(
                _contractNFT,
                _tokenId,
                address(this),
                _msgSender()
            );
            item.state = ItemState.UNLIST;
        } else {
            _transferERC1155(
                _contractNFT,
                _tokenId,
                _amount,
                address(this),
                _msgSender()
            );
            if (_amount == item.amount) {
                item.state = ItemState.UNLIST;
                item.amount = 0;
            } else {
                item.amount -= _amount;
            }
        }
    }

    function getItemStoreLength(
        address _contractNFT,
        uint256 _tokenId
    ) public view returns (uint256 length) {
        uint256 slot;
        assembly {
            slot := itemStore.slot
        }

        bytes32 location = keccak256(
            abi.encode(
                uint256(_tokenId),
                keccak256(abi.encode(address(_contractNFT), uint256(slot)))
            )
        );

        assembly {
            length := sload(location)
        }
    }

    function _listItem(
        address _contractNFT,
        uint256 _tokenId,
        address _contractERC20,
        uint256 _price
    ) private {
        require(_is721(_contractNFT), "Marketplace: not erc721 type");
        require(
            ICurrency(_currencyAddress).currencyState(_contractERC20) == true,
            "Marketplace: Unallow token address"
        );
        require(
            IERC721(_contractNFT).ownerOf(_tokenId) == _msgSender(),
            "Marketplace: You are not owner of tokenId"
        );

        _transferERC721(_contractNFT, _tokenId, _msgSender(), address(this));

        uint256 previousLength = getItemStoreLength(_contractNFT, _tokenId);
        if (previousLength > 0) {
            uint256 previousStoreId = previousLength - 1;
            _changeItemState(
                _contractNFT,
                _tokenId,
                previousStoreId,
                ItemState.UNLIST
            );
        }

        itemStore[_contractNFT][_tokenId].push(
            Item(
                _msgSender(),
                1,
                _contractERC20,
                _price,
                ContractType.ERC721,
                ItemState.LIST
            )
        );

        emit ListingItem(
            previousLength,
            _msgSender(),
            address(this),
            1,
            _contractNFT,
            _tokenId,
            _contractERC20,
            _price
        );
    }

    function _listBulkItems(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _amount,
        address _contractERC20,
        uint256 _price
    ) private {
        require(_is1155(_contractNFT), "Marketplace: not erc1155 type");
        require(
            ICurrency(_currencyAddress).currencyState(_contractERC20) == true,
            "Marketplace: Unallow token address"
        );
        require(
            IERC1155(_contractNFT).balanceOf(_msgSender(), _tokenId) >= _amount,
            "Marketplace: You don't have enough tokenId"
        );

        _transferERC1155(
            _contractNFT,
            _tokenId,
            _amount,
            _msgSender(),
            address(this)
        );

        uint256 previousLength = getItemStoreLength(_contractNFT, _tokenId);
        itemStore[_contractNFT][_tokenId].push(
            Item(
                _msgSender(),
                _amount,
                _contractERC20,
                _price,
                ContractType.ERC1155,
                ItemState.LIST
            )
        );

        emit ListingBulkItem(
            previousLength,
            _msgSender(),
            address(this),
            _amount,
            _contractNFT,
            _tokenId,
            _contractERC20,
            _price
        );
    }

    function _changeItemState(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _storeId,
        ItemState state
    ) private {
        Item storage itemStoreValue = itemStore[_contractNFT][_tokenId][
            _storeId
        ];
        itemStoreValue.state = state;
    }

    function _transferERC721(
        address _contractNFT,
        uint256 _tokenId,
        address _sender,
        address _recipient
    ) private {
        IERC721(_contractNFT).transferFrom(_sender, _recipient, _tokenId);
    }

    function _transferERC1155(
        address _contractNFT,
        uint256 _tokenId,
        uint256 _amount,
        address _sender,
        address _recipient
    ) private {
        IERC1155(_contractNFT).safeTransferFrom(
            _sender,
            _recipient,
            _tokenId,
            _amount,
            "0x"
        );
    }

    function _is721(address _contractNFT) private view returns (bool) {
        return
            IERC165(_contractNFT).supportsInterface(type(IERC721).interfaceId);
    }

    function _is1155(address _contractNFT) private view returns (bool) {
        return
            IERC165(_contractNFT).supportsInterface(type(IERC1155).interfaceId);
    }
}
