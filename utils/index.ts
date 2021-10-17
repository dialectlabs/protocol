import { EmbeddedWallet } from './Wallet';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import * as idl_ from './dialect.json';
import * as programs_ from './programs.json';

export const idl = idl_;
export const programs = programs_;

export type ProviderPropsType = {
  children: JSX.Element;
};

export const display = (publicKey: PublicKey | string): string => {
  const s = publicKey.toString();
  return `${s.slice(0, 4)}...${s.slice(s.length - 4)}`;
};

export const getPublicKey = (
  wallet: EmbeddedWallet | null | undefined,
  abbreviate = false
): string | null => {
  // if (!wallet || !wallet.connected) return null;
  if (!wallet) return null;

  const pubkeyStr = `${wallet?.publicKey?.toBase58()}`;
  if (!abbreviate) return pubkeyStr;

  return (
    `${pubkeyStr?.slice(0, 4)}...${pubkeyStr?.slice(pubkeyStr?.length - 4)}` ||
    null
  );
};

export class Wallet_ extends EmbeddedWallet {
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

export function sleep(
  ms: number
): Promise<(value: (() => void) | PromiseLike<() => void>) => void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
