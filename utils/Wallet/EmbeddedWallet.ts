/**
 * Node only wallet.
 */

import { Keypair, Signer, PublicKey, Transaction } from '@solana/web3.js';

export type SendTxRequest = {
  tx: Transaction;
  signers: Array<Signer | undefined>;
};

/**
 * Wallet interface for objects that can be used to sign provider transactions.
 */
export interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export class EmbeddedWallet implements Wallet {
  constructor(readonly signer: Keypair) {}

  static embedded(secretKey: Uint8Array): EmbeddedWallet {
    const signer = Keypair.fromSecretKey(secretKey); // :(
    return new EmbeddedWallet(signer);
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.signer);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map((t) => {
      t.partialSign(this.signer);
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.signer.publicKey;
  }
}
