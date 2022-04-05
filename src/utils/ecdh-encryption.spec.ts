import { expect } from 'chai';
import {
  Curve25519KeyPair,
  ecdhDecrypt,
  ecdhEncrypt,
  ENCRYPTION_OVERHEAD_BYTES,
} from './ecdh-encryption';
import { randomBytes } from 'tweetnacl';
import { NONCE_SIZE_BYTES } from './nonce-generator';
import { Keypair } from '@solana/web3.js';
import ed2curve from 'ed2curve';

function generateCurve25519Keypair() {
  const { publicKey, secretKey } = new Keypair();
  const keyPair: Curve25519KeyPair = ed2curve.convertKeyPair({
    publicKey: publicKey.toBytes(),
    secretKey,
  })!;
  return keyPair;
}

describe('ECDH encryptor/decryptor test', async () => {
  /*
   tweetnacl source code references:
   https://github.com/dchest/tweetnacl-js/blob/master/nacl-fast.js#L2076
   https://github.com/dchest/tweetnacl-js/blob/master/nacl-fast.js#L2202
   https://github.com/dchest/tweetnacl-js/blob/master/nacl-fast.js#L2266
 */
  it('should be always 16 bytes overhead after encryption', () => {
    // given
    // generate arithmetic progression a_0 = 1, d = 8, n = 128
    const messageSizes = Array(128)
      .fill(1)
      .map((element, index) => (index + 1) * 8);
    // when
    const sizesComparison = messageSizes.map((size) => {
      const unencrypted = randomBytes(size);
      const nonce = randomBytes(NONCE_SIZE_BYTES);
      const keyPair1 = generateCurve25519Keypair();
      const keyPair2 = generateCurve25519Keypair();

      const encrypted = ecdhEncrypt(
        unencrypted,
        keyPair1,
        keyPair2.publicKey,
        nonce,
      );
      return {
        sizeBefore: unencrypted.byteLength,
        sizeAfter: encrypted.byteLength,
        sizeDiff: encrypted.byteLength - unencrypted.byteLength,
      };
    });
    // then
    sizesComparison.forEach(({ sizeDiff }) => {
      expect(sizeDiff).to.eq(ENCRYPTION_OVERHEAD_BYTES);
    });
  });

  it('should be possible to decrypt using the same keypair that was used in encryption', () => {
    // given
    const unencrypted = randomBytes(10);
    const nonce = randomBytes(NONCE_SIZE_BYTES);
    const party1KeyPair = generateCurve25519Keypair();
    const party2KeyPair = generateCurve25519Keypair();
    const encrypted = ecdhEncrypt(
      unencrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // when
    const decrypted = ecdhDecrypt(
      encrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // then
    expect(unencrypted).to.not.deep.eq(encrypted);
    expect(decrypted).to.deep.eq(unencrypted);
  });

  it('should be possible to decrypt using other party keypair', () => {
    // given
    const unencrypted = randomBytes(10);
    const nonce = randomBytes(NONCE_SIZE_BYTES);
    const party1KeyPair = generateCurve25519Keypair();
    const party2KeyPair = generateCurve25519Keypair();
    const encrypted = ecdhEncrypt(
      unencrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // when
    const decrypted = ecdhDecrypt(
      encrypted,
      party2KeyPair,
      party1KeyPair.publicKey,
      nonce,
    );
    // then
    expect(unencrypted).to.not.deep.eq(encrypted);
    expect(decrypted).to.deep.eq(unencrypted);
  });
});
