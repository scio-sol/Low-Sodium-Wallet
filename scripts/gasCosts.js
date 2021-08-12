const { ethers } = require("hardhat");

async function main() {
 
    var factory; // Contract deployer
    var owner, bobby, alice, james, addrs; // Different accounts provided by ethers
    var contract;
    var block;
    var costOfDeployment, costOfTransaction, costOfAmmendment, costOfCancel, costOfFinish;

    /**
     *  10, 1 and 0.01 eth in BigNumber format. This is an -ethers.js- quirk related to having ints that are 256bit.
     *  Also, the address 0x0.
     */
    var tenEther       = ethers.BigNumber.from("10000000000000000000");
    var oneEther       = ethers.BigNumber.from("1000000000000000000");
    var tenMillionGwei = ethers.BigNumber.from("10000000000000000");
    var addressZero = ethers.constants.AddressZero;

    factory = await ethers.getContractFactory("LowSodiumWallet");
    [owner, bobby, alice, james, ...addrs] = await ethers.getSigners();

    contract = await factory.deploy(86400);
    block = await ethers.provider.getBlock();
    costOfDeployment = block.gasUsed;
    
    await owner.sendTransaction({ to: contract.address, value: tenEther });

    var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
    block = await ethers.provider.getBlock();
    costOfTransaction = block.gasUsed;
    response = await response.wait();
    var event = response.events[0].args;
    var id = event.ID;
 
    await contract.ammendDestination(id, alice.address);
    block = await ethers.provider.getBlock();
    costOfAmmendment = block.gasUsed;

    await contract.cancelTransaction(id);
    block = await ethers.provider.getBlock();
    costOfCancel = block.gasUsed;

    response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
    response = await response.wait();
    event = response.events[0].args;
    id = event.ID;

    await network.provider.send("evm_increaseTime", [86401]);
    await contract.finishTransaction(id);
    block = await ethers.provider.getBlock();
    costOfFinish = block.gasUsed;

    console.log();
    console.log("Action | Gas Cost | Eth Cost(approx. 50Gwei) | $ (at 2000$/eth");
    console.log("Deploy |" + costOfDeployment.toString() + "   | " + costOfDeployment.toNumber()/(20 * 10 ** 6) + "               | " + costOfDeployment.toNumber()/(10 ** 4));
    console.log("Start  |" + costOfTransaction.toString() + "    | " + costOfTransaction.toNumber()/(20 * 10 ** 6) + "                | " + costOfTransaction.toNumber()/(10 ** 4));
    console.log("Ammend |" + costOfAmmendment.toString() + "     | " + costOfAmmendment.toNumber()/(20 * 10 ** 6) + "                | " + costOfAmmendment.toNumber()/(10 ** 4));
    console.log("Cancel |" + costOfCancel.toString() + "     | " + costOfCancel.toNumber()/(20 * 10 ** 6) + "               | " + costOfCancel.toNumber()/(10 ** 4));
    console.log("Finish |" + costOfFinish.toString() + "     | " + costOfFinish.toNumber()/(20 * 10 ** 6) + "                 | " + costOfFinish.toNumber()/(10 ** 4));
 
  }
 
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
