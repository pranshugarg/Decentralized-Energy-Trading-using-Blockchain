const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545")); //connect to RPC provider
const Exchange = require ('./build/Exchange.json');


// const instance = new web3.eth.Contract
const instance =  new web3.eth.Contract(
    JSON.parse(Exchange.interface), //ABI
    '0xEA900a25A6f0E8129Cbf26DEaf10d221176ad104'  
                                                  //after deploy.js jo contract create hua hai
);

module.exports = instance;

/*
Run as administrator in powershell
set-executionpolicy remotesigned
npm install -g --production windows-build-tools

npm install -g ganache-cli
ganache-cli     
This will start up the client and generate 10 accounts for you to use, each with 100 ETH

Available Accounts
==================
0 to 9

Private Keys
==================
0 to 9

HD Wallet
==================
Mnemonic:      bind era finish run paddle elder thumb solar awesome plastic maid aunt
Base HD Path:  m/44'/60'/0'/0/{account_index}

Gas Price
==================
20000000000

Gas Limit
==================
6721975

Call Gas Limit
==================
9007199254740991

Listening on 127.0.0.1:8545
___________________________________________________________

Once MetaMask is set up, select the network menu in the upper-left. 
Then select “Localhost 8545” as your network as shown below.
Next, add a couple of accounts to MetaMask by going to the colored circle at the right top -> Import Account, 
and then copying in a private key from the list printed out in your terminal when you started Ganache-CLI.

npm install -g truffle

Web2, which brought us social media and e-commerce platforms, revolutionizing social interactions, 
bringing producers and consumers of information, goods, and services closer together, and allowed us
to enjoy P2P interactions on a global scale. But there was always a middleman: 
a platform acting as a trusted intermediary between A and B who did not know or trust each other. 

Blockchain seems to be a driving force of the next generation Internet, the Decentralized Web, or Web3
and gives rise to Decentralized Web Stack.  */