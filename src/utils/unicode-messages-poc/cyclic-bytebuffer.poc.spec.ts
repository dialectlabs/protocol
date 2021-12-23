import ByteBuffer from 'bytebuffer';
import { expect } from 'chai';
import {
  BufferItem,
  CyclicByteBuffer,
  ITEM_METADATA_OVERHEAD,
} from './cyclic-bytebuffer.poc';

describe('Test cyclic buffer', async () => {
  it('when empty returns empty messages', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const all = buffer.items();
    // then
    expect(all).to.be.deep.eq([]);
  });

  it('single item added, returns it', () => {
    // given
    const buffer = new CyclicByteBuffer(5);
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const all = buffer.append(bb1).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('single items added capacity totally equals item size, returns it', () => {
    // given
    const buffer = new CyclicByteBuffer(1 + ITEM_METADATA_OVERHEAD);
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const all = buffer.append(bb1).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('overwrites single item', () => {
    // given
    const buffer = new CyclicByteBuffer(1 + ITEM_METADATA_OVERHEAD);
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('overwrites single item', () => {
    // given
    const buffer = new CyclicByteBuffer(1 + ITEM_METADATA_OVERHEAD);
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('two items added returns both', () => {
    // given
    const buffer = new CyclicByteBuffer(2 * (1 + ITEM_METADATA_OVERHEAD));
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
      {
        offset: 3,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('two items added returns both [2]', () => {
    // given
    const buffer = new CyclicByteBuffer(2 * (1 + ITEM_METADATA_OVERHEAD) + 1);
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
      {
        offset: 3,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('two items added returns both [3]', () => {
    // given
    const buffer = new CyclicByteBuffer(
      2 * (1 + ITEM_METADATA_OVERHEAD) + ITEM_METADATA_OVERHEAD,
    );
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
      {
        offset: 3,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('3 three items added, first removed ', () => {
    // given
    const buffer = new CyclicByteBuffer(2 * (1 + ITEM_METADATA_OVERHEAD));
    // when
    const bb1 = new ByteBuffer().writeByte(1).flip().compact();
    const bb2 = new ByteBuffer().writeByte(2).flip().compact();
    const bb3 = new ByteBuffer().writeByte(3).flip().compact();
    const all = buffer.append(bb1).append(bb2).append(bb3).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 3,
        buffer: bb2,
      },
      {
        offset: 0,
        buffer: bb3,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('long buffer write/read', () => {
    // given
    const buffer = new CyclicByteBuffer(
      2 + ITEM_METADATA_OVERHEAD + 1 + ITEM_METADATA_OVERHEAD,
    );
    // when
    const bb1 = new ByteBuffer().writeString('12').flip().compact();
    const bb2 = new ByteBuffer().writeString('3').flip().compact();
    const all = buffer.append(bb1).append(bb2).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 0,
        buffer: bb1,
      },
      {
        offset: 4,
        buffer: bb2,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('long buffer write, overwrite /read', () => {
    // given
    const buffer = new CyclicByteBuffer(
      2 + ITEM_METADATA_OVERHEAD + 1 + ITEM_METADATA_OVERHEAD,
    );
    // when
    const bb1 = new ByteBuffer().writeString('12').flip().compact();
    const bb2 = new ByteBuffer().writeString('3').flip().compact();
    const bb3 = new ByteBuffer().writeString('45').flip().compact();
    const all = buffer.append(bb1).append(bb2).append(bb3).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 4,
        buffer: bb2,
      },
      {
        offset: 0,
        buffer: bb3,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('long buffer write, overwrite /read 2', () => {
    // given
    const buffer = new CyclicByteBuffer(
      3 + ITEM_METADATA_OVERHEAD + 1 + ITEM_METADATA_OVERHEAD,
    ); // when
    const bb1 = new ByteBuffer().writeString('123').flip().compact();
    const bb2 = new ByteBuffer().writeString('4').flip().compact();
    const bb3 = new ByteBuffer().writeString('56').flip().compact();
    const all = buffer.append(bb1).append(bb2).append(bb3).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 5,
        buffer: bb2,
      },
      {
        offset: 0,
        buffer: bb3,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });

  it('long buffer write, overwrite /read 3', () => {
    // given
    const buffer = new CyclicByteBuffer(
      1 + ITEM_METADATA_OVERHEAD + 3 * (2 + ITEM_METADATA_OVERHEAD),
    ); // when
    const bb1 = new ByteBuffer().writeString('1').flip().compact();
    const bb2 = new ByteBuffer().writeString('23').flip().compact();
    const bb3 = new ByteBuffer().writeString('34').flip().compact();
    const bb4 = new ByteBuffer().writeString('567').flip().compact();
    const all = buffer.append(bb1).append(bb2).append(bb3).append(bb4).items();
    // then
    const expected: BufferItem[] = [
      {
        offset: 7,
        buffer: bb3,
      },
      {
        offset: 0,
        buffer: bb4,
      },
    ];
    expect(all).to.be.deep.eq(expected);
  });
});
