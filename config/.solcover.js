module.exports = {
  skipFiles: [
    "./contracts/standard/collection/clones/ReentrancyGuardStorage.sol",
    "./contracts/standard/collection/clones/ReentrancyGuardUpgradeable.sol",
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
    yulDetails: {
      stackAllocation: true,
    },
  },
};
