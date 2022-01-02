import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { EmbeddedWallet } from './Wallet';
import * as idl_ from './dialect.json';
import * as programs_ from './programs.json';
import { ecdhDecrypt, ecdhEncrypt } from './ecdh-encryption';

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
  abbreviate = false,
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
  ms: number,
): Promise<(value: (() => void) | PromiseLike<() => void>) => void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
Transactions
*/

export async function waitForFinality(
  program: anchor.Program,
  transactionStr: string,
  finality: anchor.web3.Finality | undefined = 'confirmed',
  maxRetries = 10, // try 10 times
  sleepDuration = 500, // wait 0.5s between tries
): Promise<anchor.web3.TransactionResponse> {
  try {
    return await waitForFinality_inner(
      program,
      transactionStr,
      finality,
      maxRetries,
      sleepDuration,
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function waitForFinality_inner(
  program: anchor.Program,
  transactionStr: string,
  finality: anchor.web3.Finality | undefined = 'confirmed',
  maxRetries = 10, // try 10 times
  sleepDuration = 500, // wait 0.5s between tries
): Promise<anchor.web3.TransactionResponse> {
  let transaction: anchor.web3.TransactionResponse | null = null;
  for (let n = 0; n < maxRetries; n++) {
    transaction = await program.provider.connection.getTransaction(
      transactionStr,
      { commitment: finality },
    );
    if (transaction) {
      break;
    }
    await sleep(sleepDuration);
  }
  if (!transaction) {
    throw new Error('Transaction failed to finalize');
  }
  return transaction;
}

// TODO: instead use separate diffie-helman key with public key signed by the RSA private key.
export function encryptMessage(
  msg: Uint8Array,
  sAccount: anchor.web3.Signer,
  rPublicKey: PublicKey,
  nonce: Uint8Array,
): Uint8Array {
  return ecdhEncrypt(
    msg,
    {
      publicKey: sAccount.publicKey.toBytes(),
      secretKey: sAccount.secretKey,
    },
    rPublicKey.toBytes(),
    nonce,
  );
}

export function decryptMessage(
  msg: Uint8Array,
  account: anchor.web3.Keypair,
  fromPk: PublicKey,
  nonce: Uint8Array,
): Uint8Array | null {
  return ecdhDecrypt(
    msg,
    {
      publicKey: account.publicKey.toBytes(),
      secretKey: account.secretKey,
    },
    fromPk.toBytes(),
    nonce,
  );
}

export type DeviceToken = {
  encryptedArray: number[];
  nonce: number[];
}

export function deviceTokenIsPresent(deviceToken: DeviceToken): boolean {
  return Boolean(deviceToken?.encryptedArray.some((e: number) => e !== 0));
}
