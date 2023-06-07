const hre = require("hardhat");

const BUSD = "0xe9e7cea3dedca5984780bafc599bd69add087d56";

async function main() {
  let data = {};

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplaceProxy = await upgrades.deployProxy(Marketplace, [], {
    kind: "uups",
  });

  const Currency = await hre.ethers.getContractFactory("Currency");
  const currencyProxy = await upgrades.deployProxy(Currency, [], {
    kind: "uups",
  });

  let tx;

  // Marketplace setting
  tx = await marketplaceProxy.setCurrencyAddress(currencyProxy.address);
  await tx.wait();
  tx = await marketplaceProxy.setTreasuryAddress(treasuryProxy.address);
  await tx.wait();

  // CURRENCY setting
  if (FIXED_DAI_ADDRESS_ERC20) {
    tx = await currencyProxy.addCurrency(
      BUSD,
      "https://storage.googleapis.com/subgraph-images/1637013062085BUSD-Coin-Pool.jpeg"
    ); // DAI ADDRESS
    await tx.wait();
  }

  tx = await currencyProxy.addCurrency(
    "0x0000000000000000000000000000000000000000",
    "https://cdn.iconscout.com/icon/premium/png-512-thumb/binance-coin-bnb-7266775-5978349.png?f=avif&w=256"
  ); // DAI ADDRESS
  await tx.wait();

  data.marketplace = {
    address: marketplaceProxy.address,
    hash: marketplaceProxy.deployTransaction.hash,
    arguments: [],
  };
  data.currency = {
    address: currencyProxy.address,
    hash: currencyProxy.deployTransaction.hash,
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
