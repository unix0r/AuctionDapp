module.exports = {
  networks: {
    //Blockchain for deploying
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 3000000,
      gasPrice: 20000000000
    }
  },
  //Compiler to compile Smart Contracts
  compilers: {
    solc: {
      version: "native",// Use native installed solc compiler
      settings: {
        optimizer: {
          enabled: true, 
          runs: 200    
        }
      }
    }
  }
};

