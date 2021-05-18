const EC = require('elliptic').ec; //libreria para generar las public y private key
const ec = new EC('secp256k1'); // secp256k1 es el algoritmo utilizado por BitCoin

//generar las key y obtenerlas, necesarias para firmar as transacciones, para verificar el balance en el wallet
// Generate a new key pair and convert them to hex-strings
const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');

console.log();
console.log('Your public key (also your wallet address, freely shareable)\n ',publicKey);

console.log();
console.log('Your private key (keep this secret! To sign transactions)\n ',publicKey);



//node keygenerator.js