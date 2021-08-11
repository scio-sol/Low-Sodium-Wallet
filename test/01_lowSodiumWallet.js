const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Low Sodium Wallet - Unit Tests", async function() {

    var factory; // Contract deployer
    var owner, bobby, alice, james, addrs; // Different accounts provided by ethers
    var contract;

    /**
     *  10, 1 and 0.01 eth in BigNumber format. This is an -ethers.js- quirk related to having ints that are 256bit.
     *  Also, the address 0x0.
     */
    var tenEther       = ethers.BigNumber.from("10000000000000000000");
    var oneEther       = ethers.BigNumber.from("1000000000000000000");
    var tenMillionGwei = ethers.BigNumber.from("10000000000000000");
    var addressZero = ethers.constants.AddressZero;

    this.beforeAll(async function() {

        factory = await ethers.getContractFactory("LowSodiumWallet");
        [owner, bobby, alice, james, ...addrs] = await ethers.getSigners();
        contract = await factory.deploy(86400); // One day to maturity
        
        await owner.sendTransaction({ to: contract.address, value: tenEther });

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

            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            var block = await ethers.provider.getBlock();
            response = await response.wait();
            var event = response.events[0].args;
            
            expect(event.owner).to.be.equal(owner.address);
            expect(event.ID).to.not.be.equal(0);
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
            await expect(contract.orderTransaction(addressZero, tenEther.mul(10), bobby.address))
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
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            var block = await ethers.provider.getBlock();
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            response = await contract.ammendDestination(id, alice.address);
            response = await response.wait();
            event = response.events[0].args;
            
            expect(event.destination).to.be.equal(alice.address);
            expect(event.ID).to.be.equal(id);

            expect(event.owner).to.be.equal(owner.address);
            expect(event.maturity).to.be.equal(block.timestamp + 86400);
            expect(event.token).to.be.equal(addressZero);
            expect(event.amount).to.be.equal(tenMillionGwei);
        });

        it("Fails when called by someone other than the owner - ammend", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await expect(contract.connect(bobby).ammendDestination(id, alice.address)).to.be.reverted;
            await expect(contract.connect(alice).ammendDestination(id, alice.address)).to.be.reverted;
            await expect(contract.connect(james).ammendDestination(id, alice.address)).to.be.reverted;
            
        });

        it("Fails when destination is the same as origin - ammend", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await expect(contract.ammendDestination(id, this.address)).to.be.reverted;
            
        });

        it("Fails if half mature - ammend", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            /**
             *  86400 seconds is 24 hours (tx maturity)
             *  46800 seconds is 13 hours (more than half)
             */
            await network.provider.send("evm_increaseTime", [46800]);
            await expect(contract.ammendDestination(id, alice.address)).to.be.reverted;

        });

        it("Fails if mature - ammend", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await network.provider.send("evm_increaseTime", [86401]);
            await expect(contract.ammendDestination(id, alice.address)).to.be.reverted;

        });

        it("Fails if id does not exist - ammend", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;
            id += 100;

            await expect(contract.ammendDestination(id, alice.address)).to.be.reverted;

        });

    });

    describe("Cancel Transaction", async function() {
        
        it("Succesful canceling under regular conditions - cancel", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            var block = await ethers.provider.getBlock();
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            response = await contract.cancelTransaction(id);
            response = await response.wait();
            event = response.events[0].args;
            
            expect(event.ID).to.be.equal(id);

            expect(event.owner).to.be.equal(owner.address);
            expect(event.maturity).to.be.equal(block.timestamp + 86400);
            expect(event.token).to.be.equal(addressZero);
            expect(event.amount).to.be.equal(tenMillionGwei);
            expect(event.destination).to.be.equal(bobby.address);
        });

        it("Fails when called by someone other than the owner - cancel", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await expect(contract.connect(bobby).cancelTransaction(id)).to.be.reverted;
            await expect(contract.connect(alice).cancelTransaction(id)).to.be.reverted;
            await expect(contract.connect(james).cancelTransaction(id)).to.be.reverted;
            
        });

        it("Does not change the balance of the account - cancel", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            var balance = await ethers.provider.getBalance(contract.address);
            await expect(contract.cancelTransaction(id)).to.not.be.reverted;
            expect(await ethers.provider.getBalance(contract.address)).to.be.equal(balance);
            
        });

        it("Does not fail if half mature - cancel", async () => {

            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await network.provider.send("evm_increaseTime", [46800]);
            await expect(contract.cancelTransaction(id)).to.not.be.reverted;

        });

        it("Fails if mature - cancel", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await network.provider.send("evm_increaseTime", [86401]);
            await expect(contract.cancelTransaction(id)).to.be.reverted;

        });

        it("Fails if id does not exist - cancel", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;
            id += 100;

            await expect(contract.cancelTransaction(id)).to.be.reverted;

        });

    });

    describe("Finish Transaction", async function() {
        
        it("Succesful finishing under regular conditions - finish", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            var block = await ethers.provider.getBlock();
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await network.provider.send("evm_increaseTime", [86401]);
            response = await contract.finishTransaction(id);
            response = await response.wait();
            event = response.events[0].args;
            
            expect(event.ID).to.be.equal(id);

            expect(event.owner).to.be.equal(owner.address);
            expect(event.maturity).to.be.equal(block.timestamp + 86400);
            expect(event.token).to.be.equal(addressZero);
            expect(event.amount).to.be.equal(tenMillionGwei);
            expect(event.destination).to.be.equal(bobby.address);
        });

        it("Success when called by someone other than the owner - finish", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;
            response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            event = response.events[0].args;
            var id2 = event.ID;
            response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            event = response.events[0].args;
            var id3 = event.ID;

            await network.provider.send("evm_increaseTime", [86401]);
            await expect(contract.connect(bobby).finishTransaction(id)).to.not.be.reverted;
            await expect(contract.connect(alice).finishTransaction(id2)).to.not.be.reverted;
            await expect(contract.connect(james).finishTransaction(id3)).to.not.be.reverted;
            
        });

        it("Changes the balance of the account - finish", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            var balance = await ethers.provider.getBalance(contract.address);
            await network.provider.send("evm_increaseTime", [86401]);
            await expect(contract.finishTransaction(id)).to.not.be.reverted;
            expect(await ethers.provider.getBalance(contract.address)).to.be.equal(balance.sub(tenMillionGwei));
            
        });

        it("Fails if half mature - finish", async () => {

            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;

            await network.provider.send("evm_increaseTime", [46800]);
            await expect(contract.finishTransaction(id)).to.be.reverted;

        });

        it("Fails if id does not exist - finish", async () => {
            
            var response = await contract.orderTransaction(addressZero, tenMillionGwei, bobby.address);
            response = await response.wait();
            var event = response.events[0].args;
            var id = event.ID;
            id += 100;

            await network.provider.send("evm_increaseTime", [86401]);
            await expect(contract.finishTransaction(id)).to.be.reverted;

        });

    });

});

// TODO test interaction with a token