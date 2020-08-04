module.exports = {
  networks: {
    //Blockchain for deploying
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 3e6,
      gasPrice: 2e10
    }
  },
  //Compiler to compile Smart Contracts
  compilers: {
    solc: {
      version: "^0.6.12"// Fetch exact version from solc-bin
    }
  }
};

