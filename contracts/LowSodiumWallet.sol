// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LowSodiumWallet {

    struct PendingTransaction {
        address contractAddress;
        uint64 maturity;

        uint256 amount;
        address destination;
    }

    mapping ( address => bool ) blackList;

    mapping ( uint => PendingTransaction ) pendingTransactions;
    mapping ( address => uint256 ) reserved;

    uint256 nonce;
    uint64 immutable delay;
    address immutable owner;

    constructor(uint64 _delay, address _owner) {
        nonce = 0;
        delay = _delay;
        owner = _owner;

        blackList[address(this)] = true;
    }

    function orderTransaction(address _contractAddress, uint256 _amount, address _destination) external returns (uint256) {

        require(msg.sender == owner);

        require(!blackList[_destination]);

        if(_contractAddress == address(0)) {
            require(address(this).balance >= _amount + reserved[address(0)]);
        } else {
            require(IERC20(_contractAddress).balanceOf(address(this)) >= _amount + reserved[_contractAddress]);
        }

        nonce++;
        PendingTransaction memory pt;
        pt.contractAddress = _contractAddress;
        pt.maturity = uint64(block.timestamp) + delay;
        pt.amount = _amount;
        pt.destination = _destination;
        pendingTransactions[nonce] = pt;
        reserved[_contractAddress] += _amount;

        return nonce;

    }

    function ammendDestination(uint256 _txId, address _destination) external {

        require(msg.sender == owner);

        require(!blackList[_destination]);

        require(pendingTransactions[_txId].maturity > block.timestamp + delay/2);

        pendingTransactions[_txId].destination = _destination;

    }

    function cancelTransaction(uint256 _txId) external {

        require(msg.sender == owner);

        PendingTransaction memory pt = pendingTransactions[_txId];

        require(pt.maturity > block.timestamp);

        reserved[pt.contractAddress] -= pt.amount;
        delete(pendingTransactions[_txId]);

    }

    function finishTransaction(uint256 _txId) external payable {

        require(msg.sender == owner);

        PendingTransaction memory pt = pendingTransactions[_txId];

        require(pt.amount > 0);
        require(pt.maturity < block.timestamp);

        reserved[pt.contractAddress] -= pt.amount;
        delete(pendingTransactions[_txId]);

        if(pt.contractAddress == address(0)) {
            payable(pt.destination).transfer(pt.amount);
        } else {
            IERC20(pt.contractAddress).transfer(pt.destination, pt.amount);
        }

    }
    
}