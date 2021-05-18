const crypto = require('crypto');
// const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec; 
const ec = new EC('secp256k1');



class Transaction {
     /**
   * @param {string} fromAddress
   * @param {string} toAddress
   * @param {number} amount
   */
    constructor(fromAddress, toAddress, amount){
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    

    /**
   * Creates a SHA256 hash of the transaction
   *    hash para firmar la pivate key
   * @returns {string}
   */
    calculateHash() {
        return crypto.createHash('sha256').update(this.fromAddress + this.toAddress + this.amount + this.timestamp).digest('hex');
    }



    /**
   * Signs a transaction with the given signingKey (which is an Elliptic keypair
   * object that contains a private key). The signature is then stored inside the
   * transaction object and later stored on the blockchain.
   *
   * @param {string} signingKey
   */
    signTransaction(signingKey){
        //antes de firmar la transaction, chequear si la public key es = a la fromAddress. El fromAddress es una public key
        // You can only send a transaction from the wallet that is linked to your
        // key. So here we check if the fromAddress matches your publicKey
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('No puede firmar transacciones de otras billeteras');
        }
   
         //hash de la transaction
         // Calculate the hash of this transaction, sign it with the key
        // and store it inside the transaction obect
         const hashTx = this.calculateHash();
         //crear firma
         const sig =  signingKey.sign(hashTx, 'base64');

         this.signature = sig.toDER('hex');         
    }

     


      /**
     * Checks if the signature is valid (transaction has not been tampered with).
     * It uses the fromAddress as the public key.
     * check si la firma de la transaccion es valida
     * @returns {boolean}
     */
     isValid() {
        //el fromaddress=null es valido porque es el caso de la recompensa  
        // If the transaction doesn't have a from address we assume it's a
        // mining reward and that it's valid. You could verify this in a
        // different way (special field for instance)
        if (this.fromAddress === null ) return true; 

        //hay una firma?
        if (!this.signature || this.signature.length === 0) {
             throw new Error('No esta firmada la transaccion')
        }

        //extraer el public key
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        //verificar que el hash de este bloque fue firmado con la firma signature
        return publicKey.verify(this.calculateHash(), this.signature);
     }

}




class Block {
   
    //timestamp: cuando fue creado el block
    //transactions: la data asociada a este block, en caso de monedas, la informacion asociada a la transaccion como cantidad trasnferida, la recibida etc
    //previousHash: string hash del bloque anteriro a este, que asegura la integridad del blockchain

     /**
   * @param {number} timestamp
   * @param {Transaction[]} transactions
   * @param {string} previousHash
   */
    constructor(timestamp, transactions, previousHash = ''){
         this.timestamp = timestamp;
         this.transactions = transactions;
         this.previousHash = previousHash; 
         this.hash = this.calculateHash(); //hash del bloque, que debe ser calculada
         this.nonce = 0;
    }

    
    /**
   * Returns the SHA256 of this block (by processing all the data stored
   * inside this block)
   * calculo del hash
   * @returns {string}
   */
    calculateHash(){
        return crypto.createHash('sha256').update(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).digest('hex');
    }




    /**
     * metodo para la mineria
   * Starts the mining process on the block. It changes the 'nonce' until the hash
   * of the block starts with enough zeros (= difficulty)
   *
   * @param {number} difficulty
   */
    mineBlock(difficulty){
        while ( this.hash.substring(0, difficulty) !== Array( difficulty + 1 ).join('0') ) { //if difficulty=5, Array( 5 + 1 ).join("0") = 00000,  (this.hash.substring(0, 5) !== 00000)
            this.nonce++; 
            this.hash = this.calculateHash();
        }
        console.log("Block mined: " + this.hash);
    }



    /**
   * Validates all the transactions inside this block (signature + hash) and
   * returns true if everything checks out. False if the block is invalid.
   *verificar todas las transacciones el el bloque actual
   * @returns {boolean}
   */
    hasValidTransactions(){
        for (const tx of this.transactions) {
            if (!tx.isValid()){
                return false;
            }
        }
        return true;
    }

}




//Clase para inicializar el blockchain
class Blockchain{

    constructor(){
        this.chain = [this.createGenesisBlock( )];
        this.difficulty = 2; //la dificultad determina la cantidad de cero a la izquierda del hash
        this.pendingTransactions = []; //para guardar las transacciones temporales antes de que sean agregadas a un bloque
        this.miningReward = 100; //cantidad de monedas de recompensa cuando sea minado un bloque correctamente
    }

    
     /**
      * 
      * crear el bloque inicial (Genensis)
   * @returns {Block}
   */
    createGenesisBlock(){
        return new Block(Date.parse('2021-05-01'),[], '0');
    }



   

    /**
     * obtener el ultimo block
   * Returns the latest block on our chain. Useful when you want to create a
   * new Block and you need the hash of the previous Block.
   *
   * @returns {Block[]}
   */
    getLatestBlock(){
        return this.chain[this.chain.length - 1];
    }



    //agregar un nuevo block
    // addBlock(newBlock){
    //     newBlock.previousHash = this.getLatestBlock().hash; //previousHash = el hash del bloque anterior
    //     //newBlock.hash = newBlock.calculateHash(); //calcular el hash del nuevo bloque  
    //     newBlock.mineBlock(this.difficulty);
    //     this.chain.push(newBlock);  //agregar el nuevo block a la cadena
    // }




    //minado de las transacciones pendientes y pago de la recompensa cuando se logra minar un bloque
    /**
   * Takes all the pending transactions, puts them in a Block and starts the
   * mining process. It also adds a transaction to send the mining reward to
   * the given address.
   *
   * @param {string} miningRewardAddress
   */
    minePendingTransactions(miningRewardAddress) { //miningRewardAddress = direccion a donde sera depositada la recompensa si es minado el bloque correctamente
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward); // recompensa, fromAddress=null porque es enviado desde el sistema
        this.pendingTransactions.push(rewardTx); 


        //crear el block
        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash); //en la vida real no se pueden agregar todas las transacciones pendientes a un solo bloque, xk excederia el tamaño del bloque, los minero deben escojer que transacciones incluir
        //minar el block
        block.mineBlock(this.difficulty);

        console.log('Block minado correctamente');
        //agregar el block minado al chain
        this.chain.push(block);

        //resetar el array de pendingTransactions y crear una nueva transaccion para dar la recompensa al minero, esta recompensa sera enviada en el proximo bloque minado
        this.pendingTransactions = [ ];
    }



    //agregar la transaccion a las transacciones pendientes
     /**
   * Add a new transaction to the list of pending transactions (to be added
   * next time the mining process starts). This verifies that the given
   * transaction is properly signed.
   *
   * @param {Transaction} transaction
   */
    addTransaction(transaction){
        //verificar que existan las direcciones fromAddressy toAddress
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('La transaccion debe incluir el origen y el destino');
        }

        //verificar que la transaccion sea valida
        if (!transaction.isValid()) {
            throw new Error('No se puede agregar una transaccion invalida a la cadena');
        }

        if (transaction.amount <= 0) {
            throw new Error('Transaction amount should be higher than 0');
          }

           // Making sure that the amount sent is not greater than existing balance
        if (this.getBalanceOfAddress(transaction.fromAddress) < transaction.amount) {
            throw new Error('Not enough balance');
        }

        this.pendingTransactions.push(transaction);
        console.log('Transaccion agregada: ', transaction);
    }

    
    //verificar el balance del address, su cuenta no es almacenada en ninguna variable o lugar, sino que cuando se consulta el balance se busca en todas las transacciones y se recosntruye su balance
    /**
   * Returns the balance of a given wallet address.
   *
   * @param {string} address
   * @returns {number} The balance of the wallet
   */
    getBalanceOfAddress(address){
        let balance = 0;
        for (const block of this.chain) {
            for (const trans of block.transactions) {//como cada bloque contiene multiple transacciones
                if (trans.fromAddress === address) { //fue una operacion de trasnferencia
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) { //fue una operacion donde recibio 
                    balance += trans.amount;
                }
            }    
        }

        console.log('getBalanceOfAddress ', balance);
        return balance;//su balance
    }


     /**
   * Returns a list of all transactions that happened
   * to and from the given wallet address.
   *
   * @param  {string} address
   * @return {Transaction[]}
   */
  getAllTransactionsForWallet(address) {
    const txs = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push(tx);
        }
      }
    }

    console.log('get transactions for wallet count ', txs.length);
    // debug('get transactions for wallet count: %s', txs.length);
    return txs;
  }



    //verificar integridad de cada block en la chain
     /**
   * Loops over all the blocks in the chain and verify if they are properly
   * linked together and nobody has tampered with the hashes. By checking
   * the blocks it also verifies the (signed) transactions inside of them.
   *
   * @returns {boolean}
   */
    isChainValid(){

        // Check if the Genesis block hasn't been tampered with by comparing
        // the output of createGenesisBlock with the first block on our chain
        const realGenesis = JSON.stringify(this.createGenesisBlock());

        if (realGenesis !== JSON.stringify(this.chain[0])) {
            return false;
          }

        //se inicia en 1 porque 0 es el block Genesis
         // Check the remaining blocks on the chain to see if there hashes and
        // signatures are correct
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i]; //block actual
            const previousBlock = this.chain[i-1]; //block anterior

            //verifica que todas las transaccionesen el bloque actual sean validas
            if (!currentBlock.hasValidTransactions()) {
                return false
            }
                
            //verificar el hash del bloque actual
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            //que el block actual  apunte al block anterior correcto, para esto la propiedad previousHash del block actual tiene que coincidir con el hash del block anterior
            if (currentBlock.previousHash !== previousBlock.hash  ) {
                return false; 
            }

            //integridad del block correcta
            return true;
        }
    }


}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
module.exports.Block = Block;


