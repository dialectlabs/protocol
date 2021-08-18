import Wallet from '@project-serum/sol-wallet-adapter';
import {
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';

export type ProviderPropsType = {
  children: JSX.Element;
};

export const display = (publicKey: PublicKey | string): string => {
  const s = publicKey.toString();
  return `${s.slice(0, 4)}...${s.slice(s.length - 4)}`;
};

export const getPublicKey = (wallet: Wallet | null | undefined, abbreviate = false): string | null => {
  if (!wallet || !wallet.connected) return null;

  const pubkeyStr = `${wallet?.publicKey?.toBase58()}`;
  if (!abbreviate) return pubkeyStr;

  return `${pubkeyStr?.slice(0, 4)}...${pubkeyStr?.slice(pubkeyStr?.length - 4)}` || null;
};

/**
 * Wallet interface for objects that can be used to sign provider transactions. Copied from https://github.com/project-serum/anchor.
 */
 interface WalletInterface {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export class Wallet_ extends Wallet implements WalletInterface {
  // anchor needs a non-optional publicKey attribute, sollet says it's optional, so we need to fix it here.
  get publicKey(): PublicKey {
    const pkornull = super.publicKey;
    let pk: PublicKey;
    if (!pkornull) {
      const kp = Keypair.generate();
      pk = kp.publicKey;
    } else {
      pk = pkornull as PublicKey;
    }
    return pk;
  }
}

export function sleep(ms: number): Promise<(value: (() => void) | PromiseLike<() => void>) => void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
