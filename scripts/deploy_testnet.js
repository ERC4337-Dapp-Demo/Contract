const hre = require("hardhat");

const OWNER_ADDRESS = "0xe42B1F6BE2DDb834615943F2b41242B172788E7E";
const FIXED_DAI_ADDRESS_ERC20 = "0xd555d9CF3fd5F0C5F806EF7B5D9236E04CF938EA";

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
      "0xd555d9CF3fd5F0C5F806EF7B5D9236E04CF938EA",
      "https://imgs.search.brave.com/Aq8sa18AW9rN3NN2eCKDW8ZdYy5cGDJSbgR1SehCqk4/rs:fit:1024:1024:1/g:ce/aHR0cHM6Ly9ibG9j/a29ub21pLTlmY2Qu/a3hjZG4uY29tL3dw/LWNvbnRlbnQvdXBs/b2Fkcy8yMDE5LzEw/L2Jsb2Nrb25vbWkt/ZGFpLXJlYnJhbmQt/MTAyNHgxMDI0LnBu/Zw"
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
