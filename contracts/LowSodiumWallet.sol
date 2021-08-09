// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/**
    The ultimate goal here is to make this resistant to attacks even by someone that has figured out
    your private key.

    We want:
    a) No surprises. No attacks that are done and finished and irreversible in a small amount of time.
    b) Time to ask for help and consult with an expert.
    c) Ideally, an (offchain) system to notify the owner of any change. An attacker would need to attack this
        first.
    
 */
contract LowSodiumWallet {

    /**
        Three 32-bytes chunks per transaction.
    
        A contract address of 0x0 is interpreted as "Ethereum".
        Amount is always in lowest-denomination of the token that we are dealing with.
        Destination is the new owner.
     */
    struct PendingTransaction {

        uint96 ID;
        address contractAddress;
        
        uint96 maturity;
        address destination;

        uint256 amount;  
    }

    // A map of ID->Tx.
    mapping ( uint96 => PendingTransaction ) private pendingTransactions;

    // A map of reserved money per denomination (address as proxy for denomination. 0x0 = Eth).
    mapping ( address => uint256 ) private reserved;

    /**
        Simplest counter. Why is it an uint96? Struct packing.

        You can only perform 79228 trillion trillion transactions with this wallet, 
        and after that your money will be locked down forever. If you do less than 
        three trillion trillion transactions a day, it will not run out in at least
        ~72 years.

        Why do I put the ID into the struct? Good qwestion, I don't know.
     */
    uint96 private nonce;

    // All transactions have a pending period of -delay-.
    uint96 immutable private delay;
    // Owner address. Owner controls everything.
    address immutable private owner;




    event  LSW_Transaction_Created(address owner, uint96 ID, address token, uint96 maturity, uint256 amount, address destination);
    event LSW_Transaction_Modified(address owner, uint96 ID, address token, uint96 maturity, uint256 amount, address destination);
    event LSW_Transaction_Canceled(address owner, uint96 ID, address token, uint96 maturity, uint256 amount, address destination);
    event LSW_Transaction_Finished(address owner, uint96 ID, address token, uint96 maturity, uint256 amount, address destination);




    constructor(uint96 _delay) {

        nonce = 0; // The first tx is #1 because the nonce pre-increments
        delay = _delay;
        owner = msg.sender;

    }



    /**

        Register the pending tx if everything is alright.

     */
    function orderTransaction(address _contractAddress, uint256 _amount, address _destination) external {

        require(msg.sender == owner);

        // Do not send money to itself
        require(_destination != address(this));

        // This block checks for available funds
        if(_contractAddress == address(0)) {
            require(address(this).balance >= _amount + reserved[address(0)]);  // Ether
        } else {
            require(IERC20(_contractAddress).balanceOf(address(this)) >= _amount + reserved[_contractAddress]); // ERC20-compatible token
        }

        nonce++;

        PendingTransaction memory pt;
        pt.contractAddress = _contractAddress;
        pt.maturity = uint96(block.timestamp) + delay;

        pt.destination = _destination;
        pt.ID = nonce;

        pt.amount = _amount;

        pendingTransactions[nonce] = pt;
        reserved[_contractAddress] += _amount;

        emit LSW_Transaction_Created(msg.sender, pt.ID, pt.contractAddress, pt.maturity, pt.amount, pt.destination);

    }

    /**
        We refuse to ammend the destination if half the delay has passed,
        to protect against some hypothetical last-second attack where some
        actor who knows the pwd of the account waits for the user to send
        a tx and changes the destination at the last moment.
     */
    function ammendDestination(uint96 _txId, address _destination) external {

        require(msg.sender == owner);

        // Do not send money to itself
        require(_destination != address(this));

        PendingTransaction memory pt = pendingTransactions[_txId];

        // Check the timestamp. If id is not correct, maturity will be = 0 and it will revert.
        require(pt.maturity > block.timestamp + delay/2);

        pendingTransactions[_txId].destination = _destination;

        emit LSW_Transaction_Modified(msg.sender, pt.ID, pt.contractAddress, pt.maturity, pt.amount, _destination);

    }

    /**
        Can be made at any point prior to maturity. Cancels the tx immediately and irreversibly.
     */
    function cancelTransaction(uint96 _txId) external {

        require(msg.sender == owner);

        PendingTransaction memory pt = pendingTransactions[_txId];

        // Check the timestamp. If id is not correct, maturity will be = 0 and it will revert.
        require(pt.maturity > block.timestamp);

        reserved[pt.contractAddress] -= pt.amount;
        delete(pendingTransactions[_txId]);

        emit LSW_Transaction_Canceled(msg.sender, pt.ID, pt.contractAddress, pt.maturity, pt.amount, pt.destination);

    }

    /**
        Can be made by anyone at any point >= maturity. Executes the tx.
     */
    function finishTransaction(uint96 _txId) external payable {

        PendingTransaction memory pt = pendingTransactions[_txId];

        require(pt.amount > 0); // Checks that it exists.
        require(pt.maturity <= block.timestamp);

        reserved[pt.contractAddress] -= pt.amount;
        delete(pendingTransactions[_txId]);

        /**
            Execution. Does not check for funds or specific conditions,
            so wierd ERC20s could make this fail. Imagine a contract that burns tokens
            everyday, or one that does not let you withdraw (ever).
        */
        if(pt.contractAddress == address(0)) {
            payable(pt.destination).transfer(pt.amount);
        } else {
            IERC20(pt.contractAddress).transfer(pt.destination, pt.amount);
        }

        emit LSW_Transaction_Finished(msg.sender, pt.ID, pt.contractAddress, pt.maturity, pt.amount, pt.destination);

    }

    receive() external payable {}
    fallback() external payable {}
    
}