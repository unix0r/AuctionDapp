module.exports = {
  networks: {
    development: {
      host: "192.168.1.99",
      port: 7545,
      network_id: "*",
      gas: 3000000
    }
  },
  		  	compilers: {
    			solc: {
      				version: "^0.4.18",    // Fetch exact version from solc-bin (default: truffle's version)
    			}
  			}
};
