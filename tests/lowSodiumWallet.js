const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Low Sodium Wallet - Unit Tests", async function() {
    const factory, owner, bobby, alice, addrs, contract;

    this.beforeAll(async function() {
        factory = await ethers.getContractFactory("LowSodiumWallet");
        [owner, bobby, alice, ...addrs] = await ethers.getSigners();
    });

    this.beforeEach(async function() {
        contract = await factory.deploy();
    });

    it("Should have some behavior", async () => {
        await expect(true).to.be.true;
    });
});