const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Marketplace", () => {
  let owner;
  let addr1;
  let addrs;
  let marketProxyContract;
  let currencyProxyContract;
  let whitelistProxyContract;
  let n721Mock;
  let n1155Mock;
  let daiMock;
  let usdtMock;

  before(async () => {
    [owner, addr1, ...addrs] = await ethers.getSigners();

    // NORMAL DEPLOY
    let n721FMock = await ethers.getContractFactory(
      "contracts/mock/ERC721Mock.sol:ERC721Mock"
    );
    n721Mock = await n721FMock.deploy();
    let n1155FMock = await ethers.getContractFactory(
      "contracts/mock/ERC1155Mock.sol:ERC1155Mock"
    );
    n1155Mock = await n1155FMock.deploy();
    let daiFMock = await ethers.getContractFactory("Dai");
    daiMock = await daiFMock.deploy();
    let usdtFMock = await ethers.getContractFactory("Dai");
    usdtMock = await usdtFMock.deploy();

    // UPGRADEABLE DEPLOY
    let currencyFactory = await ethers.getContractFactory("Currency");
    currencyProxyContract = await upgrades.deployProxy(currencyFactory, [], {
      kind: "uups",
    });
    let marketFactory = await ethers.getContractFactory("Marketplace");
    marketProxyContract = await upgrades.deployProxy(marketFactory, [], {
      kind: "uups",
    });

    let tx;

    // Mint erc20 mock for addr1
    tx = await daiMock.connect(addr1).mint(1000000);
    await tx.wait();
    tx = await usdtMock.connect(addr1).mint(1000000);
    await tx.wait();

    // Mint erc721
    tx = await n721Mock.safeMint(owner.address, `ipfs://md${1}`);
    await tx.wait();
    tx = await n721Mock.safeMint(owner.address, `ipfs://md${2}`);
    await tx.wait();

    tx = await n721Mock.connect(addr1).safeMint(addr1.address, `ipfs://md${3}`);
    await tx.wait();
    tx = await n721Mock.connect(addr1).safeMint(addr1.address, `ipfs://md${4}`);
    await tx.wait();

    tx = await n721Mock.safeMint(owner.address, `ipfs://md${5}`);
    await tx.wait();

    tx = await n721Mock.safeMint(owner.address, `ipfs://md${5}`);
    await tx.wait();

    // Mint erc1155
    tx = await n1155Mock.mint(owner.address, 0, 15, "0x");
    await tx.wait();

    tx = await n1155Mock.setURI(0, "ipfs://1155");
    await tx.wait();

    tx = await n1155Mock.mint(owner.address, 1, 15, "0x");
    await tx.wait();

    tx = await n1155Mock.setURI(1, "ipfs://1155");
    await tx.wait();

    tx = await n1155Mock.mint(owner.address, 2, 15, "0x");
    await tx.wait();

    tx = await n1155Mock.setURI(2, "ipfs://1155");
    await tx.wait();

    tx = await marketProxyContract.setCurrencyAddress(
      currencyProxyContract.address
    );
    await tx.wait();

    tx = await currencyProxyContract.addCurrency(daiMock.address, "Super dai");
    await tx.wait();

    tx = await currencyProxyContract.addCurrency(
      ethers.constants.AddressZero,
      "Super dai"
    );
    await tx.wait();
  });

  describe("Get balance of owner after deploy", () => {
    it("Check balance of owner on n721Mock contract", async () => {
      expect(parseInt(await n721Mock.balanceOf(owner.address))).to.be.eq(4);
    });
    it("Check balance of owner on n1155Mock contract", async () => {
      expect(parseInt(await n1155Mock.balanceOf(owner.address, 0))).to.be.eq(
        15
      );
    });
  });

  describe("Listing Item", () => {
    describe("Listing Item successfully with ERC721 and ETH", () => {
      before(async () => {
        let tx = await n721Mock.approve(marketProxyContract.address, 4);
        await tx.wait();

        tx = await marketProxyContract.listItem(
          n721Mock.address,
          4,
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1").toString()
        ); // 1500 wei
        await tx.wait();
      });

      it("Check all field in itemStore of Marketplace contract", async () => {
        const tx = await marketProxyContract.itemStore(n721Mock.address, 4, 0);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("1");
        expect(tx[2]).to.be.eq(ethers.constants.AddressZero);
        expect(tx[3].toString()).to.be.eq(
          ethers.utils.parseEther("1").toString()
        );
        expect(tx[4].toString()).to.be.eq("0");
        expect(tx[5].toString()).to.be.eq("0");
      });

      it("Check total length of listig item", async () => {
        // ONLY FOR DEEP TEST
        const tx = await marketProxyContract.getItemStoreLength(
          n721Mock.address,
          4
        );
        expect(parseInt(tx)).to.be.eq(1);
      });

      it("Check contract address is owner of nft", async () => {
        const tx = await n721Mock.ownerOf(4);
        expect(tx).to.be.eq(marketProxyContract.address);
      });
    });

    describe("Listing Item successfully with ERC721", () => {
      before(async () => {
        let tx = await n721Mock.approve(marketProxyContract.address, 0);
        await tx.wait();

        tx = await marketProxyContract.listItem(
          n721Mock.address,
          0,
          daiMock.address,
          1500
        ); // 1500 wei
        await tx.wait();
      });

      it("Check all field in itemStore of Marketplace contract", async () => {
        const tx = await marketProxyContract.itemStore(n721Mock.address, 0, 0);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("1");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("0");
        expect(tx[5].toString()).to.be.eq("0");
      });

      it("Check contract address is owner of nft", async () => {
        const tx = await n721Mock.ownerOf(0);
        expect(tx).to.be.eq(marketProxyContract.address);
      });

      it("Check total length of listig item", async () => {
        // ONLY FOR DEEP TEST
        const tx = await marketProxyContract.getItemStoreLength(
          n721Mock.address,
          0
        );
        expect(parseInt(tx)).to.be.eq(1);
      });

      describe("Listing item failed when try to listing it again", () => {
        it("Check", async () => {
          let tx = marketProxyContract.listItem(
            n721Mock.address,
            0,
            daiMock.address,
            1500
          ); // 1500 wei
          expect(tx).to.be.revertedWith(
            "Marketplace: You are not owner of tokenId"
          );
        });
      });

      describe("Listing item again and check previous item", () => {
        before(async () => {
          tx = await marketProxyContract.cancelItem(n721Mock.address, 0, 0);
          await tx.wait();

          tx = await n721Mock.approve(marketProxyContract.address, 0);
          await tx.wait();

          tx = await marketProxyContract.listItem(
            n721Mock.address,
            0,
            daiMock.address,
            1500
          ); // 1500 wei
          await tx.wait();
        });

        it("Check all field in itemStore of Marketplace contract", async () => {
          const tx = await marketProxyContract.itemStore(
            n721Mock.address,
            0,
            1
          );
          expect(tx[0]).to.be.eq(owner.address);
          expect(tx[1].toString()).to.be.eq("1");
          expect(tx[2]).to.be.eq(daiMock.address);
          expect(tx[3].toString()).to.be.eq("1500");
          expect(tx[4].toString()).to.be.eq("0");
          expect(tx[5].toString()).to.be.eq("0");
        });

        it("Check whether previous item is closed", async () => {
          const tx = await marketProxyContract.itemStore(
            n721Mock.address,
            0,
            0
          );
          expect(tx[5].toString()).to.be.eq("1");
        });

        it("Check total length of listig item", async () => {
          // ONLY FOR DEEP TEST
          const tx = await marketProxyContract.getItemStoreLength(
            n721Mock.address,
            0
          );
          expect(parseInt(tx)).to.be.eq(2);
        });
      });

      describe("Can not buy item has been canceled", () => {
        it("Check", async () => {
          await expect(
            marketProxyContract
              .connect(addr1)
              .buyItem(n721Mock.address, 0, 0, 1)
          ).revertedWith("Marketplace: Item is not listing!");
        });
      });
    });

    describe("Listing item successfully with ERC1155", () => {
      before(async () => {
        let tx = await n1155Mock.setApprovalForAll(
          marketProxyContract.address,
          true
        );
        await tx.wait();

        tx = await marketProxyContract.listBulkItems(
          n1155Mock.address,
          0,
          5,
          daiMock.address,
          1500
        ); // 1500 wei
        await tx.wait();
      });

      it("Check all field in itemStore of Marketplace contract", async () => {
        const tx = await marketProxyContract.itemStore(n1155Mock.address, 0, 0);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("5");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("1");
        expect(tx[5].toString()).to.be.eq("0");
      });

      it("Check total length of listig item", async () => {
        const tx = await marketProxyContract.getItemStoreLength(
          n1155Mock.address,
          0
        );
        expect(parseInt(tx)).to.be.eq(1);
      });

      it("Check balance of token id", async () => {
        const tx = await n1155Mock.balanceOf(marketProxyContract.address, 0);
        expect(parseInt(tx)).to.be.eq(5);
      });

      describe("Listing More item but failed since not enough NFT amount", () => {
        it("Check", async () => {
          await expect(
            marketProxyContract.listBulkItems(
              n1155Mock.address,
              0,
              11,
              daiMock.address,
              1500
            )
          ).to.be.revertedWith("Marketplace: You don't have enough tokenId");
        });
      });

      describe("Listing More Item and successfully", () => {
        before(async () => {
          let tx = await n1155Mock.setApprovalForAll(
            marketProxyContract.address,
            true
          );
          await tx.wait();
          tx = await marketProxyContract.listBulkItems(
            n1155Mock.address,
            0,
            10,
            daiMock.address,
            1500
          );
          await tx.wait();
        });

        it("Check all field in itemStore of Marketplace contract", async () => {
          const tx = await marketProxyContract.itemStore(
            n1155Mock.address,
            0,
            1
          );
          expect(tx[0]).to.be.eq(owner.address);
          expect(tx[1].toString()).to.be.eq("10");
          expect(tx[2]).to.be.eq(daiMock.address);
          expect(tx[3].toString()).to.be.eq("1500");
          expect(tx[4].toString()).to.be.eq("1");
          expect(tx[5].toString()).to.be.eq("0");
        });

        it("Check total length of listig item", async () => {
          const tx = await marketProxyContract.getItemStoreLength(
            n1155Mock.address,
            0
          );
          expect(parseInt(tx)).to.be.eq(2);
        });

        it("Check balance of token id", async () => {
          const tx = await n1155Mock.balanceOf(marketProxyContract.address, 0);
          expect(parseInt(tx)).to.be.eq(15);
        });
      });
    });

    describe("Listing Item failed since not owner of nft", () => {
      it("Check", async () => {
        await expect(
          marketProxyContract
            .connect(addr1)
            .listItem(n721Mock.address, 0, daiMock.address, 1500)
        ).to.be.revertedWith("Marketplace: You are not owner of tokenId");
      });
    });

    describe("Unallow address token when listing", () => {
      it("Check", async () => {
        let tx = await n1155Mock.setApprovalForAll(
          marketProxyContract.address,
          true
        );
        await tx.wait();
        await expect(
          marketProxyContract.listBulkItems(
            n1155Mock.address,
            1,
            5,
            usdtMock.address,
            1500
          )
        ).to.be.revertedWith("Marketplace: Unallow token address");
      });
    });

    it("Listing fail because it is not erc721", async () => {
      await expect(
        marketProxyContract.listItem(
          n1155Mock.address,
          0,
          currencyProxyContract.address,
          1500
        )
      ).to.be.revertedWith("Marketplace: not erc721 type");
    });

    it("Listing fail because it is not erc1155", async () => {
      await expect(
        marketProxyContract.listBulkItems(
          n721Mock.address,
          0,
          2,
          currencyProxyContract.address,
          1500
        )
      ).to.be.revertedWith("Marketplace: not erc1155 type");
    });
  });

  describe("Update Price Item", () => {
    before(async () => {
      let tx = await n721Mock.approve(marketProxyContract.address, 5);
      await tx.wait();

      tx = await marketProxyContract.listItem(
        n721Mock.address,
        5,
        daiMock.address,
        1500
      );
      await tx.wait();
    });

    it("Update price successfully", async () => {
      let tx = await marketProxyContract.updatePriceItem(
        n721Mock.address,
        5,
        0,
        2000
      );
      await tx.wait();

      const data = await marketProxyContract.itemStore(n721Mock.address, 5, 0);
      expect(parseInt(data[3])).to.be.eq(2000);
    });

    it("Fail if update price from non-owner of itemStore", async () => {
      await expect(
        marketProxyContract
          .connect(addr1)
          .updatePriceItem(n721Mock.address, 5, 0, 2000)
      ).to.be.revertedWith("Marketplace: You are not owner!");
    });

    it("Fail if it is unlist", async () => {
      let tx = await marketProxyContract.cancelItem(n721Mock.address, 5, 0);
      await tx.wait();

      await expect(
        marketProxyContract.updatePriceItem(n721Mock.address, 5, 0, 2000)
      ).to.be.revertedWith("Marketplace: Item is not listing!");
    });
  });

  describe("Buy Item", () => {
    it("Buy Item failed because you try to buy overamount", async () => {
      expect(
        marketProxyContract.buyItem(n721Mock.address, 0, 0, 2)
      ).to.be.revertedWith("Marketplace: Overamount of nfts");
    });

    describe("Buy Item ERC1155 with amount smaller than current selled amount", () => {
      before(async () => {
        let tx = await daiMock
          .connect(addr1)
          .approve(marketProxyContract.address, 4950);
        await tx.wait();
        tx = await marketProxyContract
          .connect(addr1)
          .buyItem(n1155Mock.address, 0, 0, 3);
        await tx.wait();
      });

      it("Check balance after bought", async () => {
        expect(parseInt(await n1155Mock.balanceOf(addr1.address, 0))).to.be.eq(
          3
        );
      });

      it("Check item store data", async () => {
        tx = await marketProxyContract.itemStore(n1155Mock.address, 0, 0);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("2");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("1");
        expect(tx[5].toString()).to.be.eq("0"); // Here mean it is UNLIST
      });
    });

    describe("Buy Item ERC1155 with all amount", () => {
      before(async () => {
        let tx = await daiMock
          .connect(addr1)
          .approve(marketProxyContract.address, 16500);
        await tx.wait();
        tx = await marketProxyContract
          .connect(addr1)
          .buyItem(n1155Mock.address, 0, 1, 10);
        await tx.wait();
      });

      it("Check item store data", async () => {
        tx = await marketProxyContract.itemStore(n1155Mock.address, 0, 1);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("0");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("1");
        expect(tx[5].toString()).to.be.eq("1"); // Here mean it is UNLIST
      });
    });

    describe("Buy Item with ERC721 and ETH", () => {
      let beforeBalance;
      let afterBalance;
      before(async () => {
        beforeBalance = await addr1.getBalance();
        tx = await marketProxyContract
          .connect(addr1)
          .buyItem(n721Mock.address, 4, 0, 1, {
            value: ethers.utils.parseEther("1.1").toString(),
          });
        await tx.wait();
        afterBalance = await addr1.getBalance();
      });
      it("Check after balance", async () => {
        expect(
          ethers.BigNumber.from(beforeBalance)
            .sub(afterBalance)
            .gt(ethers.utils.parseEther("1.1"))
        ).to.be.eq(true);
      });
      it("Check new owner", async () => {
        const data = await n721Mock.ownerOf(4);
        expect(data).to.be.eq(addr1.address);
      });
    });

    describe("Buy Item with ERC721", () => {
      let beforeBalance;
      let afterBalance;
      before(async () => {
        let tx = await daiMock
          .connect(addr1)
          .approve(marketProxyContract.address, 1650);
        await tx.wait();

        beforeBalance = await daiMock.balanceOf(owner.address);
        tx = await marketProxyContract
          .connect(addr1)
          .buyItem(n721Mock.address, 0, 1, 1);
        await tx.wait();
        afterBalance = await daiMock.balanceOf(owner.address);
      });

      it("Check new owner of nft", async () => {
        const ownerAddress = await n721Mock.ownerOf(0);
        expect(ownerAddress).to.be.eq(addr1.address);
      });

      it("Check data of item erc721", async () => {
        tx = await marketProxyContract.itemStore(n721Mock.address, 0, 0);
        expect(tx[0]).to.be.eq(owner.address);
        expect(tx[1].toString()).to.be.eq("1");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("0");
        expect(tx[5].toString()).to.be.eq("1");
      });

      it("Check balance of owner", async () => {
        expect(ethers.BigNumber.from(afterBalance).sub(beforeBalance)).to.be.eq(
          ethers.BigNumber.from(1545)
        );
      });
    });
  });

  describe("Cancel Listing", () => {
    describe("Cancel listing item successfully", () => {
      before(async () => {
        let tx = await n721Mock
          .connect(addr1)
          .approve(marketProxyContract.address, 0);
        await tx.wait();

        tx = await marketProxyContract
          .connect(addr1)
          .listItem(n721Mock.address, 0, daiMock.address, 1500); // 1500 wei
        await tx.wait();

        tx = await marketProxyContract
          .connect(addr1)
          .cancelItem(n721Mock.address, 0, 2);
        await tx.wait();
      });

      it("Check owner of nft is lister", async () => {
        const tx = await n721Mock.ownerOf(0);
        expect(tx).to.be.eq(addr1.address);
      });

      it("Check failed if you are not owner", async () => {
        await expect(
          marketProxyContract.cancelItem(n721Mock.address, 0, 2)
        ).to.be.revertedWith("Marketplace: You are not owner");
      });

      it("Check failed if item has been canceled", async () => {
        await expect(
          marketProxyContract.connect(addr1).cancelItem(n721Mock.address, 0, 2)
        ).to.be.revertedWith("Marketplace: Item has been canceled");
      });

      it("Check all field in itemStore of Marketplace contract", async () => {
        const tx = await marketProxyContract.itemStore(n721Mock.address, 0, 2);
        expect(tx[0]).to.be.eq(addr1.address);
        expect(tx[1].toString()).to.be.eq("1");
        expect(tx[2]).to.be.eq(daiMock.address);
        expect(tx[3].toString()).to.be.eq("1500");
        expect(tx[4].toString()).to.be.eq("0");
        expect(tx[5].toString()).to.be.eq("1");
      });

      it("Get length of itemStore", async () => {
        const val = await marketProxyContract.getItemStoreLength(
          n721Mock.address,
          0
        );
        expect(parseInt(val)).to.be.eq(3);
      });
    });

    describe("Cancel listing item erc1155", () => {
      before(async () => {
        let tx = await n1155Mock.setApprovalForAll(
          marketProxyContract.address,
          2
        );
        await tx.wait();

        tx = await marketProxyContract.listBulkItems(
          n1155Mock.address,
          2,
          1,
          daiMock.address,
          1500
        );
        await tx.wait();

        tx = await marketProxyContract.cancelItem(n1155Mock.address, 2, 0);
        await tx.wait();
      });

      it("Check owner", async () => {
        const val = await n1155Mock.balanceOf(owner.address, 2);
        expect(parseInt(val)).to.be.eq(15);
      });
    });
  });

  describe("Set Fee", () => {
    it("Set fee successfully", async () => {
      let tx = await marketProxyContract.FEE_PER_ITEM();
      expect(parseInt(tx)).to.be.eq(300);
      tx = await marketProxyContract.setFee(5);
      await tx.wait();
      tx = await marketProxyContract.FEE_PER_ITEM();
      expect(parseInt(tx)).to.be.eq(5);
    });

    it("Can not set fee because you are not owner", () => {
      expect(marketProxyContract.connect(addr1).setFee(5)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Set Treasury", () => {
    it("Set treasury successfully", async () => {
      tx = await marketProxyContract.setTreasuryAddress(owner.address);
      await tx.wait();
    });

    it("Can not set treasury because you are not owner", () => {
      expect(
        marketProxyContract.connect(addr1).setTreasuryAddress(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Set Currency", () => {
    it("Set currency successfully", async () => {
      tx = await marketProxyContract.setCurrencyAddress(owner.address);
      await tx.wait();
    });

    it("Can not set currency because you are not owner", () => {
      expect(
        marketProxyContract.connect(addr1).setCurrencyAddress(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
