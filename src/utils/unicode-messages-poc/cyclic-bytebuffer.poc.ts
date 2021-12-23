import ByteBuffer from 'bytebuffer';

export type BufferItem = { offset: number; buffer: ByteBuffer };

const ZERO = 0;
export const ITEM_METADATA_OVERHEAD = 2; // used to store item size, uint16

export class CyclicByteBuffer {
  private readonly buffer!: ByteBuffer;

  private readOffset = -1;

  constructor(size: number) {
    this.buffer = new ByteBuffer(size).fill(ZERO).reset();
  }

  nextItemOffset(itemSize: number): number {
    const separatorWithItemSize = 1 + itemSize;
    if (this.buffer.offset + separatorWithItemSize > this.buffer.capacity()) {
      return 0;
    }
    return this.buffer.offset + separatorWithItemSize;
  }

  // TODO: anyway limit message size to be << buffer size? or should add additional logic handle this...
  append(item: ByteBuffer) {
    const sizedItem = new ByteBuffer(ITEM_METADATA_OVERHEAD + item.capacity())
      .writeInt16(item.capacity())
      .append(item)
      .flip();
    item.flip();
    // boundary case 0: first append
    if (this.readOffset === -1 && this.buffer.offset === 0) {
      this.readOffset = this.buffer.offset;
      this.buffer.append(sizedItem);
      return this;
    }
    // boundary case 1: write till the end of buffer
    if (this.buffer.offset + sizedItem.capacity() === this.buffer.capacity()) {
      // simply write and reset buffer offset and reset buffer offset to 0
      this.buffer.append(sizedItem).flip();
      return this;
    }
    // check item exceeds capacity
    if (this.buffer.offset + sizedItem.capacity() > this.buffer.capacity()) {
      // fill buffer tail with zeros and reset buffer offset to 0
      this.buffer.fill(ZERO).flip();
    }
    if (this.buffer.offset > this.readOffset) {
      this.buffer.append(sizedItem);
      return this;
    }
    // remember current offset
    this.buffer.mark();
    // find items to be removed by moving read offset to next item
    while (this.buffer.offset + sizedItem.capacity() > this.readOffset) {
      const itemToReadSize = this.buffer.readInt16(this.readOffset);
      this.readOffset += ITEM_METADATA_OVERHEAD + itemToReadSize;
    }
    // remove all bytes starting from offset to new read offset
    this.buffer.fill(ZERO, this.buffer.markedOffset, this.readOffset);
    this.buffer.reset().append(sizedItem);
    return this;
  }

  items(): BufferItem[] {
    if (this.readOffset === -1) {
      return [];
    }
    const items: BufferItem[] = []; // accumulator for items

    // [..., w, ...,r, ...]
    let readOffset = this.readOffset;
    if (readOffset >= this.buffer.offset) {
      while (readOffset + ITEM_METADATA_OVERHEAD < this.buffer.capacity()) {
        const itemToReadSize = this.buffer.readInt16(readOffset);
        if (itemToReadSize === 0) {
          break;
        }
        const buffer = this.buffer.copy(
          readOffset + ITEM_METADATA_OVERHEAD,
          readOffset + ITEM_METADATA_OVERHEAD + itemToReadSize,
        );
        items.push({
          offset: readOffset,
          buffer,
        });
        readOffset += ITEM_METADATA_OVERHEAD + itemToReadSize;
      }
      readOffset = 0;
    }

    // [r, ..., w, ...]
    while (readOffset + ITEM_METADATA_OVERHEAD < this.buffer.offset) {
      const itemToReadSize = this.buffer.readInt16(readOffset);
      if (itemToReadSize === 0) {
        break;
      }
      const buffer = this.buffer.copy(
        readOffset + ITEM_METADATA_OVERHEAD,
        readOffset + ITEM_METADATA_OVERHEAD + itemToReadSize,
      );
      items.push({
        offset: readOffset,
        buffer,
      });
      readOffset += ITEM_METADATA_OVERHEAD + itemToReadSize;
    }

    return items;
  }
}
