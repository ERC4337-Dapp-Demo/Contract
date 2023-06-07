// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
  @dev use for setting all currencies that we use
 */
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ICurrency.sol";

contract Currency is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ICurrency
{
    address[] public currencies;
    mapping(address => bool) public override(ICurrency) currencyState; // false is locked

    event NewCurrency(address currency, string url);
    event SetPermissionCurrency(address currency, bool permission);

    mapping(address => bool) public currencyExists;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function addCurrency(
        address _contractERC20,
        string memory _imgUrl
    ) external onlyOwner {
        require(
            currencyExists[_contractERC20] == false,
            "Currency: this address exists!"
        );
        currencies.push(_contractERC20);
        currencyState[_contractERC20] = true;
        currencyExists[_contractERC20] = true;
        emit NewCurrency(_contractERC20, _imgUrl);
    }

    function setCurrency(
        address _contractERC20,
        bool _permission
    ) external onlyOwner {
        require(
            currencyExists[_contractERC20],
            "Currency: this address does not exist!"
        );
        currencyState[_contractERC20] = _permission;
        emit SetPermissionCurrency(_contractERC20, _permission);
    }

    function getLengthCurrencies() public view returns (uint256 length) {
        assembly {
            length := sload(currencies.slot)
        }
    }
}
