const hre = require("hardhat");

async function main() {
  let data = {};
  console.log("DEPLOYING...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplaceProxy = await Marketplace.deploy();
  const marketplace = await marketplaceProxy.deployed();

  console.log("Go for market", marketplace.address);

  const Currency = await hre.ethers.getContractFactory("Currency");
  const currencyProxy = await Currency.deploy();
  const currency = await currencyProxy.deployed();

  console.log("Go for currency", currencyProxy.address);

  let tx;

  // Marketplace setting
  tx = await marketplace.setCurrencyAddress(currency.address);
  await tx.wait();
  tx = await marketplace.setTreasuryAddress(
    "0x0deB52499C2e9F3921c631cb6Ad3522C576d5484"
  );
  await tx.wait();

  // CURRENCY setting
  tx = await currency.addCurrency(
    "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    ""
  );
  await tx.wait();

  tx = await currency.addCurrency(
    "0x0000000000000000000000000000000000000000",
    ""
  );
  await tx.wait();

  data.marketplace = {
    address: marketplace.address,
    hash: marketplace.deployTransaction.hash,
    arguments: [],
  };
  data.currency = {
    address: currency.address,
    hash: currency.deployTransaction.hash,
    arguments: [],
  };

  console.log("Data", data);
  console.log(
    "--------------------------------------------------------------------------"
  );
  console.log("VERIFY::COMMAND");
  let verifyCommand = "";
  Object.values(data).forEach((contract) => {
    verifyCommand += `npx hardhat verify --network testnet ${
      contract.address
    } ${contract.arguments.join(" ")}; `;
  });
  console.log(verifyCommand);
  console.log("DEPLOYED!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Data {
//   marketplace: {
//     address: '0x06c74Bc76bc5176B5e1D6295dc2fc7fB2fA298D0',
//     hash: '0xd48a5d4f3accb234acb7be7333b4cea080f785c2fc7948df3f302485e9f78d97',
//     arguments: []
//   },
//   currency: {
//     address: '0x0b0cA8f3E5ca785938F4cFBD1C419BBa24bF521d',
//     hash: '0x8d6d8bebe8d8e8ceedbf7261ba81bb0df5ca4bccaa58bec2265ea9ee44aed960',
//     arguments: []
//   }
// }
