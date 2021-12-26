import { expect } from 'chai';
import { CyclicByteBuffer } from './cyclic-bytebuffer.poc';

describe('Test cyclic buffer', async () => {
  it('correctly does first append when size < buffer size', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const item = new Uint8Array([1, 2]);
    buffer.append(item);
    // then
    expect(buffer.writeOffset).to.be.eq(4);
    expect(buffer.readOffset).to.be.eq(0);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([0, 2, 1, 2, 0]));
  });

  it('correctly does first append when item size === buffer size', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const item = new Uint8Array([1, 2, 3]);
    buffer.append(item);
    // then
    expect(buffer.writeOffset).to.be.eq(0);
    expect(buffer.readOffset).to.be.eq(0);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([0, 3, 1, 2, 3]));
  });

  it('correctly does first append + overwrite when size < buffer size', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const item1 = new Uint8Array([1, 2, 3]);
    const item2 = new Uint8Array([3, 4, 5]);
    buffer.append(item1);
    buffer.append(item2);
    // then
    expect(buffer.writeOffset).to.be.eq(0);
    expect(buffer.readOffset).to.be.eq(0);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([0, 3, 3, 4, 5]));
  });

  it('correctly does first append + overwrite when size < buffer size [2]', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const item1 = new Uint8Array([1, 2]);
    const item2 = new Uint8Array([3, 4]);
    buffer.append(item1);
    // [0, 2, 1, 2, 0]
    buffer.append(item2);
    // then
    expect(buffer.writeOffset).to.be.eq(3);
    expect(buffer.readOffset).to.be.eq(4);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([2, 3, 4, 0, 0]));
  });

  it('read offset increment with modular', () => {
    // given
    const buffer = new CyclicByteBuffer(7);
    // when
    const item1 = new Uint8Array([1, 2]);
    const item2 = new Uint8Array([3, 4, 5]);
    buffer.append(item1);
    // [0, 2, 1, 2, 0, 0, 0]
    buffer.append(item2);
    // then
    expect(buffer.writeOffset).to.be.eq(2);
    expect(buffer.readOffset).to.be.eq(4);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([4, 5, 0, 0, 0, 3, 3]));
  });

  it('read offset increment with modular', () => {
    // given
    const buffer = new CyclicByteBuffer(7);
    // when
    const item1 = new Uint8Array([1, 2]);
    const item2 = new Uint8Array([3, 4, 5]);
    const item3 = new Uint8Array([6, 7]);
    buffer.append(item1);
    // [0, 2, 1, 2, 0, 0, 0]
    buffer.append(item2);
    // [4, 5, 0, 0, 0, 3, 3]
    buffer.append(item3);
    // then
    expect(buffer.writeOffset).to.be.eq(6);
    expect(buffer.readOffset).to.be.eq(2);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([0, 0, 0, 2, 6, 7, 0]));
  });

  it('read offset increment with modular', () => {
    // given
    const buffer = new CyclicByteBuffer(10);
    // when
    const item1 = new Uint8Array([1]);
    const item2 = new Uint8Array([2]);
    const item3 = new Uint8Array([3]);
    const item4 = new Uint8Array([4]);
    buffer.append(item1);
    // [0, 1, 1, 0, 0, 0, 0, 0, 0, 0]
    buffer.append(item2);
    // [0, 1, 1, 0, 1, 2, 0, 0, 0, 0]
    buffer.append(item3);
    // [0, 1, 1, 0, 1, 2, 0, 1, 3, 0]
    buffer.append(item4);
    // then
    expect(buffer.writeOffset).to.be.eq(2);
    expect(buffer.readOffset).to.be.eq(3);
    expect(buffer.raw()).to.be.deep.eq(
      new Uint8Array([1, 4, 0, 0, 1, 2, 0, 1, 3, 0]),
    );
  });

  it('read offset increment with modular', () => {
    // given
    const buffer = new CyclicByteBuffer(7);
    // when
    const item1 = new Uint8Array([1, 2]);
    const item2 = new Uint8Array([3]);
    const item3 = new Uint8Array([4, 5]);
    buffer.append(item1);
    // [0, 2, 1, 2, 0, 0, 0]
    buffer.append(item2);
    // [0, 2, 1, 2, 0, 1, 3]
    buffer.append(item3);
    // then
    expect(buffer.writeOffset).to.be.eq(4);
    expect(buffer.readOffset).to.be.eq(4);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([0, 2, 4, 5, 0, 1, 3]));
  });

  it('correctly does first append when size < buffer size', () => {
    // given
    const buffer = new CyclicByteBuffer(6);
    // when
    const item1 = new Uint8Array([1, 2, 3]);
    const item2 = new Uint8Array([4, 5, 6]);
    const item3 = new Uint8Array([7, 8, 9]);
    buffer.append(item1);
    // [0, 3, 1, 2, 3, 0]
    buffer.append(item2);
    // [3, 4, 5, 6, 0, 0]
    buffer.append(item3);
    // then
    expect(buffer.writeOffset).to.be.eq(3);
    expect(buffer.readOffset).to.be.eq(4);
    expect(buffer.raw()).to.be.deep.eq(new Uint8Array([7, 8, 9, 0, 0, 3]));
  });
});
