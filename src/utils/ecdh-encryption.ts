import ed2curve from 'ed2curve';
import nacl from 'tweetnacl';

export const ENCRYPTION_OVERHEAD_BYTES = 16;

export class IncorrectPublicKeyFormatError extends Error {
  constructor() {
    super('IncorrectPublicKeyFormatError');
  }
}

export class AuthenticationFailedError extends Error {
  constructor() {
    super('Authentication failed during decryption attempt');
  }
}

export type Curve25519Key = Uint8Array;

export type Curve25519KeyPair = {
  publicKey: Curve25519Key;
  secretKey: Curve25519Key;
};

export type Ed25519Key = Uint8Array;

export type Ed25519KeyPair = {
  publicKey: Curve25519Key;
  secretKey: Curve25519Key;
};

export function ed25519KeyPairToCurve25519({
  publicKey,
  secretKey,
}: Ed25519KeyPair): Curve25519KeyPair {
  const curve25519KeyPair = ed2curve.convertKeyPair({
    publicKey,
    secretKey,
  });
  if (!curve25519KeyPair) {
    throw new IncorrectPublicKeyFormatError();
  }
  return curve25519KeyPair;
}

export function ed25519PublicKeyToCurve25519(key: Ed25519Key): Curve25519Key {
  const curve25519PublicKey = ed2curve.convertPublicKey(key);
  if (!curve25519PublicKey) {
    throw new IncorrectPublicKeyFormatError();
  }
  return curve25519PublicKey;
}

export function ecdhEncrypt(
  payload: Uint8Array,
  { secretKey, publicKey }: Curve25519KeyPair,
  otherPartyPublicKey: Curve25519Key,
  nonce: Uint8Array,
): Uint8Array {
  return nacl.box(payload, nonce, otherPartyPublicKey, secretKey);
}

export function ecdhDecrypt(
  payload: Uint8Array,
  { secretKey, publicKey }: Curve25519KeyPair,
  otherPartyPublicKey: Curve25519Key,
  nonce: Uint8Array,
): Uint8Array {
  const decrypted = nacl.box.open(
    payload,
    nonce,
    otherPartyPublicKey,
    secretKey,
  );
  if (!decrypted) {
    throw new AuthenticationFailedError();
  }
  return decrypted;
}
