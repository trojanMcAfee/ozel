const { assert } = require("chai");
const { ethers } = require("hardhat");
const { formatBytes32String } = ethers.utils;

describe("PayMe", function () {
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
    const user = '0x80ad03F5ce41A6DB208bAd7163709cba21ED83b8';
    const userToken = '0x3cd0DdCE7595d79743e3674EC30E77297866561E';
    const amount = 1;
    const nHash = formatBytes32String('hello');
    const sig = '0x11EB9A18fE970cFaF079FeAfdfEd59623feCCaf7';
  it("should log deposit messaage", async function () {
    const PayMe = await ethers.getContractFactory("PayMe2");
    const payme = await PayMe.deploy(registryAddr);
    await payme.deployed();

    await payme.deposit(
        user,
        userToken,
        amount,
        nHash,
        sig
    );

    // expect(await greeter.greet()).to.equal("Hello, world!");

    // const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // // wait until the transaction is mined
    // await setGreetingTx.wait();

    // expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
