[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4259bd70e892469fb580230dbee56d3e)](https://www.codacy.com?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=unix0r/AuctionDapp&amp;utm_campaign=Badge_Grade)
# AuctionDapp
Decentralized Blockchain Auction Application
This project implements the concepts for decentralized auction houses of my masterthesis for the Hochschule Furtwangen University.
The work is influenced by the example of the solidity documentation: <https://solidity.readthedocs.io/en/latest/solidity-by-example.html#blind-auction>
And examples of the mastering ethereum book: <https://github.com/ethereumbook/ethereumbook/tree/develop/code/auction_dapp>

For a copy of the masterthesis (in german) feel free to contact me.

# Instructions
Install dependencies:

sudo apt update ; sudo apt install nodejs npm git

sudo npm install -g truffle @openzeppelin/contracts truffle-assertions

Download Ganache https://www.trufflesuite.com/ganache

git clone https://github.com/unix0r/AuctionDapp

cd AuctionDapp/backend

npm install // Installs all dependencies

Start Ganache, create new workspace and link the truffle-config.js to the workspace.

truffle compile // compiles the smart contracts

truffle migrate // migrates the smart contracts to the blockchain

truffle test // runs all the tests in the test folder
