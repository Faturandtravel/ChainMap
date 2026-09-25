export type ShipmentStatus =
  | 'Processing'
  | 'In Transit'
  | 'Transit'
  | 'Delivered'
  | 'Diproses'
  | 'Dalam Pengiriman'
  | 'Terkirim';

export interface ShipmentData {
  id: string;
  shipmentId: string;
  item: string;
  fromCity: string;
  fromCoords: [number, number];
  toCity: string;
  toCoords: [number, number];
  status: ShipmentStatus;
  color: string;
  label?: string;
  sender?: string;
  recipient?: string;
  notes?: string;
  city?: string;
  coords?: [number, number];
}

export class Block {
  public hash: string = '';

  constructor(
    public index: number,
    public timestamp: string,
    public data: ShipmentData,
    public previousHash: string = ''
  ) {}

  async computeHash(): Promise<string> {
    const payload =
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.data);
    const msgBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export class LogisticsBlockchain {
  public chain: Block[] = [];

  // Clear chain
  clearChain(): void {
    this.chain = [];
  }

  // Initialize Genesis Block (Block #0)
  async init(genesisData: ShipmentData): Promise<void> {
    const genesisBlock = new Block(
      0,
      new Date().toISOString(),
      genesisData,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    genesisBlock.hash = await genesisBlock.computeHash();
    this.chain = [genesisBlock];
  }

  // Add shipment block from user input
  async addBlock(data: ShipmentData): Promise<Block> {
    const prevBlock = this.chain.length > 0 ? this.chain[this.chain.length - 1] : null;
    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      data,
      prevBlock ? prevBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000'
    );
    newBlock.hash = await newBlock.computeHash();
    this.chain.push(newBlock);
    return newBlock;
  }

  // Verify integrity of the entire blockchain
  async checkIntegrity(): Promise<{ valid: boolean; invalidBlockIndex?: number }> {
    if (this.chain.length === 0) {
      return { valid: true };
    }

    // Check genesis block hash
    const genesisRecalculated = await this.chain[0].computeHash();
    if (this.chain[0].hash !== genesisRecalculated) {
      return { valid: false, invalidBlockIndex: 0 };
    }

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      const recalculated = await current.computeHash();
      if (current.hash !== recalculated) {
        return { valid: false, invalidBlockIndex: i };
      }
      if (current.previousHash !== previous.hash) {
        return { valid: false, invalidBlockIndex: i };
      }
    }

    return { valid: true };
  }
}