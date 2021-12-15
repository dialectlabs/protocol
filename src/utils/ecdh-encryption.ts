import ed2curve from 'ed2curve';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';

export const ENCRYPTION_OVERHEAD_BYTES = 16;

export class IncorrectPublicKeyFormatError extends Error {
  constructor(party: string) {
    super(`Given '${party}' public key is not valid Ed25519 key`);
  }
}

export class AuthenticationFailedDecryptionError extends Error {
  constructor() {
    super('Authentication failed during decryption attempt');
  }
}

export type Ed25519Key = Uint8Array

export type Ed25519KeyPair = {
  publicKey: Ed25519Key
  secretKey: Ed25519Key
}

export function generateEd25519KeyPair(): Ed25519KeyPair {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBytes(),
    secretKey: keypair.secretKey,
  };
}

export function ecdhEncrypt(
  payload: Uint8Array,
  { secretKey, publicKey }: Ed25519KeyPair,
  otherPartyPublicKey: Ed25519Key,
  nonce: Uint8Array): Uint8Array {
  const curve25519KeyPair = ed2curve.convertKeyPair({
    publicKey,
    secretKey,
  });
  if (!curve25519KeyPair) {
    throw new IncorrectPublicKeyFormatError('encryptor keypair');
  }
  const otherPartyCurve25519PublicKey = ed2curve.convertPublicKey(otherPartyPublicKey);
  if (!otherPartyCurve25519PublicKey) {
    throw new IncorrectPublicKeyFormatError('other party');
  }
  return nacl.box(payload, nonce, otherPartyCurve25519PublicKey, curve25519KeyPair.secretKey);
}

export function ecdhDecrypt(
  payload: Uint8Array,
  { secretKey, publicKey }: Ed25519KeyPair,
  otherPartyPublicKey: Ed25519Key,
  nonce: Uint8Array): Uint8Array {
  const curve25519KeyPair = ed2curve.convertKeyPair({
    publicKey,
    secretKey,
  });
  if (!curve25519KeyPair) {
    throw new IncorrectPublicKeyFormatError('decryptor keypair');
  }
  const otherPartyCurve25519PublicKey = ed2curve.convertPublicKey(otherPartyPublicKey);
  if (!otherPartyCurve25519PublicKey) {
    throw new IncorrectPublicKeyFormatError('other party');
  }
  const decrypted = nacl.box.open(payload, nonce, otherPartyCurve25519PublicKey, curve25519KeyPair.secretKey);
  if (!decrypted) {
    throw new AuthenticationFailedDecryptionError();
  }
  return decrypted;
}
