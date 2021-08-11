// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {

    constructor(string memory name_, string memory symbol_, uint initialAmountPerHolder, address[] memory initialHolders) 
    ERC20(name_, symbol_)
    {

        for(uint i = 0; i < initialHolders.length; i++)
        {
            _mint(initialHolders[i], initialAmountPerHolder);
        }
    }
    
}