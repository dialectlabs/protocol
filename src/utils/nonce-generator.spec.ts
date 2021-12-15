import { expect } from 'chai';
import { generateNonce } from './nonce-generator';

describe('Nonce generator test', async () => {

  it('should always return 24 bytes', () => {
    expect(generateNonce(0)).to.be.deep.eq(new Uint8Array(Array(24).fill(0)));
    expect(generateNonce(1)).to.be.deep.eq(new Uint8Array([...Array(23).fill(0), 1]));
    expect(generateNonce(333)).be.deep.eq(new Uint8Array([...Array(21).fill(0), 3, 3, 3]));
    expect(generateNonce(55555)).to.be.deep.eq(new Uint8Array([...Array(19).fill(0), 5, 5, 5, 5, 5]));
    expect(generateNonce(-55555)).to.be.deep.eq(new Uint8Array([...Array(19).fill(0), 5, 5, 5, 5, 5]));
  });
});
