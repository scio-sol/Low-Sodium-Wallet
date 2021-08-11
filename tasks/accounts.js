task("accounts", "Lists all of our accounts in the network")
.setAction(async (taskArguments) => {
    console.log();
    var accounts = await ethers.getSigners();
    for(let i = 0; i < accounts.length; i++) {
        var s = accounts[i].address + " -> ";
        var gwei = await ethers.provider.getBalance(accounts[i].address);
        gwei = gwei.div(10 ** 9);
        gwei = gwei.toNumber();
        s += (gwei/(10 ** 9)) + " ether";
        console.log(s);
    }
});