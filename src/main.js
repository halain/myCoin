const { Blockchain, Transaction } = require('./blockchain');
const EC = require('elliptic').ec; 
const ec = new EC('secp256k1');

// Your private key goes here
const myKey = ec.keyFromPrivate('0427dfc02a8b7ff2e72ff23650586d541212bbfb8ee2a0656d1063664dc83fb4a08d017c7dcbceb89383f15a5de5869ab3ac38095d89572e6ada587eb35d35c69f');

// From that we can calculate your public key (which doubles as your wallet address)
const myWalletAddress = myKey.getPublic('hex');


// Create new instance of Blockchain class
let myCoin = new Blockchain();

// Mine first block
myCoin.minePendingTransactions(myWalletAddress);



// Create a transaction & sign it with your key
const tx1 = new Transaction(myWalletAddress, 'public_key_of_destination_here', 10);
tx1.signTransaction(myKey);
myCoin.addTransaction(tx1);

// Mine block
myCoin.minePendingTransactions(myWalletAddress);


// Create second transaction
const tx2 = new Transaction(myWalletAddress, 'address1', 50);
tx2.signTransaction(myKey);
myCoin.addTransaction(tx2);

// Mine block
myCoin.minePendingTransactions(myWalletAddress);

console.log();
console.log(`Balance of hecotr is ${myCoin.getBalanceOfAddress(myWalletAddress)}`);

// Uncomment this line if you want to test tampering with the chain
// myCoin.chain[1].transactions[0].amount = 10;

// Check if the chain is valid
console.log();
console.log('Blockchain valid?', myCoin.isChainValid() ? 'Yes' : 'No');




