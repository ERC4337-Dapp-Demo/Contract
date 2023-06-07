// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dai is ERC20 {
    constructor() ERC20("Dai Token", "DAI") {
        _mint(msg.sender, 1000000);
    }

    function mint(uint256 _amount) public {
        _mint(msg.sender, _amount);
    }
}
