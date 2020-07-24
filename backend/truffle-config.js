module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 3000000
    }
  },
  compilers: {
    solc: {
      version: "^0.6.11"// Fetch exact version from solc-bin
    }
  }
};

