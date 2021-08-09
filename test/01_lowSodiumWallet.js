const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Low Sodium Wallet - Unit Tests", async function() {

    var factory; // Contract deployer
    var owner, bobby, alice, james, addrs; // Different accounts provided by ethers
    var contract, contract2, contract6; // Three contracts with a delay of 1 day and 2 and 6 seconds.

    /**
     *  1 and 0.01 eth in BigNumber format. This is an -ethers- quirk related to having ints that are 256bit.
     *  Also, the address 0x0.
     */
    var eth            = ethers.BigNumber.from("1000000000000000000");
    var tenMillionGwei = ethers.BigNumber.from("10000000000000000");
    var addressZero = ethers.constants.AddressZero;

    /**
     *  We want to advance some transactions so that we can test cancel/ammend/finish behavior.
     *  It is better to wait here once than to wait everytime we need them.
     *  We prepopulate contract2 and 6 with some orders, and we wait 4 seconds: 
     *  more than maturity for contract2, less (but more than half) for contract6
     *  with a margin of 2 seconds either way.
     */
    this.beforeAll(async function() {

        factory = await ethers.getContractFactory("LowSodiumWallet");
        [owner, bobby, alice, james, ...addrs] = await ethers.getSigners();
        contract = await factory.deploy(86400);
        
        await owner.sendTransaction({ to: contract.address, value: eth.mul(10) }); // Sending 10 eth to contract

        contract2 = await factory.deploy(2);
        await owner.sendTransaction({ to: contract2.address, value: eth }); // Sending 1 eth to contract2

        contract6 = await factory.deploy(6);
        await owner.sendTransaction({ to: contract6.address, value: eth }); // Sending 1 eth to contract6

        // Prepopulation
        var am = 20;
        for(let i = 0; i < am; i++)
        {
            await contract2.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            await contract6.orderTransaction(addressZero, tenMillionGwei, bobby.address);
        }

        // Wait(4 sec)
        await new Promise(resolve => {
            setTimeout(resolve, 4000);
        });

    });

    /*
    this.beforeEach(async function() {
        
    });
    */

    describe("Setting up", async function() {
        
        it("Check to see if it deploys and gives an address", async () => {
            var c = await factory.deploy(86400);
            await expect(c.address).to.not.be.equal(addressZero);
        });

    });

    describe("New pending Transactions", async function() {
        
        it("Succesful ordering of a transaction under regular conditions - order", async () => {
            
            await expect(contract.orderTransaction(addressZero, tenMillionGwei, bobby.address))
            .to.not.be.reverted;

            var c = await factory.deploy(86400);
            await owner.sendTransaction({ to: c.address, value: eth });
            var res = await c.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            res = await res.wait();
            expect(res.events.length).to.be.equal(1);
            var event = res.events[0].args;
            var block = await ethers.provider.getBlock();
            
            expect(event.owner).to.be.equal(owner.address);
            expect(event.ID).to.be.equal(1);
            expect(event.maturity).to.be.equal(block.timestamp + 86400);
            expect(event.token).to.be.equal(addressZero);
            expect(event.amount).to.be.equal(tenMillionGwei);
            expect(event.destination).to.be.equal(bobby.address);

        });

        it("Fails when called by someone other than the owner - order", async () => {
            
            await expect(contract.connect(bobby).orderTransaction(addressZero, tenMillionGwei, bobby.address))
            .to.be.reverted;
            await expect(contract.connect(alice).orderTransaction(addressZero, tenMillionGwei, james.address))
            .to.be.reverted;
            
        });

        it("Fails when destination is the same as origin - order", async () => {
            
            await expect(contract.orderTransaction(addressZero, tenMillionGwei, contract.address))
            .to.be.reverted;
            
        });

        it("Fails when not enough funds to fulfill - order", async () => {
            
            // We gave it 10 eth at the beginning, must have around 9.95 free. Now we ask for 100.
            await expect(contract.orderTransaction(addressZero, eth.mul(100), bobby.address))
            .to.be.reverted;

            // We create a new contract with 0.1 eth and send half, try to send 0.07 to see it fail 
            // because too much money is reserved while balance is still 0.1
            var c = await factory.deploy(86400);
            await owner.sendTransaction({ to: c.address, value: tenMillionGwei.mul(10) });

            var pointone = tenMillionGwei.mul(10);
            var pointzerofive = tenMillionGwei.mul(5);
            var pointzeroseven = tenMillionGwei.mul(7);

            expect(await ethers.provider.getBalance(c.address)).to.be.equal(pointone);
            await expect(c.orderTransaction(addressZero, pointzerofive, bobby.address)).to.not.be.reverted;
            expect(await ethers.provider.getBalance(c.address)).to.be.equal(pointone);
            await expect(c.orderTransaction(addressZero, pointzeroseven, bobby.address)).to.be.reverted;
            expect(await ethers.provider.getBalance(c.address)).to.be.equal(pointone);

        });

    });

    describe("Ammend destination", async function() {
        
        it("Succesful ammendment under regular conditions - ammend", async () => {
            
            

        });

        it("Fails when called by someone other than the owner - ammend", async () => {
            
            
            
        });

        it("Fails when destination is the same as origin - ammend", async () => {
            
            
            
        });

        it("Fails if half mature - ammend", async () => {
            
            

        });

        it("Fails if mature - ammend", async () => {
            
            

        });

    });

});