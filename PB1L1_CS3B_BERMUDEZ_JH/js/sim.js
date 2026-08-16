// ========== Block class: creates individual blocks ==========
class Block {
    constructor(index, timestamp, data, previousHash =''){
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = 0;
      this.hash = this.calculateHash();
    }
    // ========== Generates SHA256 hash ==========
    calculateHash(){
      return CryptoJS.SHA256(
            this.index + this.previousHash
                + this.timestamp + this.data
                + this.nonce).toString();
    }
}

// ========== Blockchain class: manages chain of blocks ==========
class Blockchain {
    constructor() {
      this.chain = [this.createGenesisBlock()];
    }

    // ========== Creates first block ==========
    createGenesisBlock(){
      return new Block(0, new Date().toLocaleString(), 'Genesis Block', '0');
    }

    // ========== Returns the last block ==========
    getLatestBlock(){
        return this.chain[this.chain.length -1];
    }

    // ========== Adds new block to chain ==========
    addBlock(data) {
        const newBlock = new Block(
            this.chain.length, new Date().toLocaleString(),
            data, this.getLatestBlock().hash);
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock);
    }

    // ========== Validates entire chain ==========
    isChainValid(){
      for (let i = 1; i < this.chain.length; i++) {
        const currentBlock = this.chain[i];
        const previousBlock = this.chain[i - 1];

        if (currentBlock.hash !== currentBlock.calculateHash()) return false;
        if (currentBlock.previousHash !== previousBlock.hash) return false;
      }
      return true;
    }
}

// ========== Initialize blockchain and DOM ==========
const blockchain = new Blockchain();
const chainEl = document.getElementById('chain');
const statusEl = document.getElementById('status');
const addBlockBtn = document.getElementById('addBlockBtn');
const validateBtn = document.getElementById('validateBtn');
const blockDataInput = document.getElementById('blockData');


// ========== Render blockchain UI ==========
function renderChain() {
  chainEl.innerHTML = '';

  blockchain.chain.forEach((block, index) => {
   
    // ========== Validate block integrity ==========
    const blockIsValid = index === 0 || (
      block.hash === block.calculateHash() &&
      block.previousHash === blockchain.chain[index - 1].hash
    );

    const blockDiv = document.createElement('div');
    blockDiv.className = `block ${blockIsValid ? 'valid' : 'invalid'}`;
    blockDiv.innerHTML = `
      <div class="block-header">
        <h3>Block #${block.index}</h3>
        <span class="badge ${blockIsValid ? 'valid' : 'invalid'}">
          ${blockIsValid ? 'Valid' : 'Invalid'}
        </span>
      </div>
      <div class="field">
        <span class="label">TimeStamp</span>
        <div class="value">${block.timestamp}</div>
      </div>
      <div class="field">
        <span class="label">Data</span>
        <div class="value" contenteditable="true" data-index="${index}" data-field="data">
          ${block.data}
        </div>
      </div>
      <div class="field">
        <span class="label">Previous Hash</span>
        <div class="value">${block.previousHash}</div>
      </div>
      <div class="field">
        <span class="label">Block Hash</span>
        <div class="value" data-index="${index}" data-hash-field="true">${block.hash}</div>
      </div>
    `;

    chainEl.appendChild(blockDiv);

    // ========== Listen for data changes ==========
    const dataField = blockDiv.querySelector('[data-field="data"]');
    dataField.addEventListener('blur', () => {
      const newData = dataField.textContent;
      blockchain.chain[index].data = newData;
      blockchain.chain[index].hash = blockchain.chain[index].calculateHash();
      // ========== Re-render on change ==========
      renderChain();
      updateStatus();
    });
  });
}

// ========== Update chain status ==========
function updateStatus() {
  const valid = blockchain.isChainValid();
  statusEl.textContent = valid ? 'Chain is valid' : 'Chain is invalid';
  statusEl.className = `status ${valid ? 'valid' : 'invalid'}`;
}


// ========== Add block on click ==========
addBlockBtn.addEventListener('click', () => {
  const data = blockDataInput.value.trim() || 'Empty Data';
  blockchain.addBlock(data);
  blockDataInput.value = '';
  renderChain();
  updateStatus();
});

// ========== Validate chain on click ==========
validateBtn.addEventListener('click', updateStatus);

// ========== Add block on Enter key ==========
blockDataInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBlockBtn.click();
});

// ========== Initial render ==========
renderChain();
updateStatus();