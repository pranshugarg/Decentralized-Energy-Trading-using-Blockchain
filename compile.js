const solc = require('solc');
const pth = require('path');
const fs = require('fs-extra');  

const build_Path = pth.resolve(__dirname, 'build'); //currentdirectoy __dirname; 
const household_Path = pth.resolve(__dirname, 'contract.sol'); // get path to the contracts directory

const src = fs.readFileSync(household_Path, 'utf8');
const op = solc.compile(src, 1).contracts

console.log(op)

fs.ensureDirSync(build_Path); 

for(let contr in op){
    fs.outputJsonSync(
        pth.resolve(build_Path, contr.replace(':','') + '.json'),
        op[contr]
    );
}

/*
The properties we’ll need to use on the compiled file are the Application Binary Interface (ABI) or interface
and the bytecode. The bytecode is what will actually go onto the blockchain to make the smart contract work 
and the interface will be the Javascript layer that acts like a human friendly map of the bytecode.
*/

// node compile.js

/*
Ethereum Virtual Machine (EVM)

The result of compile() will always be an object. contracts is the top level object, containing all the contracts
 we’ve compiled. Again, in our case it’s only one contract. 
 The two properties that we really care about: interface and bytecode.*/
