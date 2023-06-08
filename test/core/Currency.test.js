const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("Currency Testing", () => {
  let owner;
  let addr1;
  let addrs;
  let currencyProxyContract;
  let daiMock;
  beforeEach(async () => {
    [owner, addr1, ...addrs] = await ethers.getSigners();
    let currencyProxy = await ethers.getContractFactory("Currency");
    currencyProxyContract = await currencyProxy.deploy();
    let daiFMock = await ethers.getContractFactory("Dai");
    daiMock = await daiFMock.deploy();
  });

  it("Test add currency successfully", async () => {
    const tx = await currencyProxyContract.addCurrency(
      daiMock.address,
      "ipfs://dai"
    );
    await tx.wait();

    const value = await currencyProxyContract.currencyExists(daiMock.address);
    expect(value).to.be.eq(true);

    const locked = await currencyProxyContract.currencyState(daiMock.address);
    expect(locked).to.be.eq(true);

    const length = await currencyProxyContract.getLengthCurrencies();
    expect(parseInt(length)).to.be.eq(1);
  });

  it("Test add currency fail when add again", async () => {
    const tx = await currencyProxyContract.addCurrency(
      daiMock.address,
      "ipfs://dai"
    );
    await tx.wait();

    await expect(
      currencyProxyContract.addCurrency(daiMock.address, "ipfs://dai")
    ).to.be.revertedWith("Currency: this address exists!");
  });

  it("Test add currency fail when not admin", async () => {
    await expect(
      currencyProxyContract
        .connect(addr1)
        .addCurrency(ethers.constants.AddressZero, "ipfs://dai")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Test set currency to lock", async () => {
    let tx = await currencyProxyContract.addCurrency(
      daiMock.address,
      "ipfs://dai"
    );
    await tx.wait();

    tx = await currencyProxyContract.setCurrency(daiMock.address, false);
    await tx.wait();

    const locked = await currencyProxyContract.currencyState(daiMock.address);
    expect(locked).to.be.eq(false);
  });

  it("Test set currency fail when not admin", async () => {
    await expect(
      currencyProxyContract
        .connect(addr1)
        .setCurrency(ethers.constants.AddressZero, false)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Test set currency fail when not exists", async () => {
    await expect(
      currencyProxyContract.setCurrency(ethers.constants.AddressZero, false)
    ).to.be.revertedWith("Currency: this address does not exist!");
  });
});
