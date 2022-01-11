import { expect } from 'chai';
import {
  ecdhDecrypt,
  ecdhEncrypt,
  ENCRYPTION_OVERHEAD_BYTES,
  generateEd25519KeyPair,
} from './ecdh-encryption';
import { randomBytes } from 'tweetnacl';
import { NONCE_SIZE_BYTES } from './nonce-generator';

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
      const encrypted = ecdhEncrypt(
        unencrypted,
        generateEd25519KeyPair(),
        generateEd25519KeyPair().publicKey,
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
    const party1KeyPair = generateEd25519KeyPair();
    const party2KeyPair = generateEd25519KeyPair();
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
    const party1KeyPair = generateEd25519KeyPair();
    const party2KeyPair = generateEd25519KeyPair();
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
