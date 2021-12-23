import ByteBuffer from 'bytebuffer';

export type BufferItem = { offset: number; buffer: ByteBuffer };

export const ZERO = 0;
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
    const itemWithMetadata = new ByteBuffer(
      ITEM_METADATA_OVERHEAD + item.capacity(),
    )
      .writeInt16(item.capacity())
      .append(item)
      .flip();
    item.flip();
    // case 0: first append called on buffer
    const isFirstAppend = this.readOffset === -1 && this.buffer.offset === 0;
    if (isFirstAppend) {
      // first append <=> readOffset not set and buffer offset is 0
      this.readOffset = this.buffer.offset;
      this.buffer.append(itemWithMetadata);
      return this;
    }
    // case 1: item ideally fits remaining buffer capacity
    const remainingCapacity = this.buffer.capacity() - this.buffer.offset;
    if (itemWithMetadata.capacity() === remainingCapacity) {
      // simply write and reset buffer offset and reset buffer offset to 0
      this.buffer.append(itemWithMetadata);
      return this;
    }
    // case 2: item fits remaining buffer capacity and read offset before write offset
    if (
      itemWithMetadata.capacity() <= remainingCapacity &&
      this.buffer.offset > this.readOffset
    ) {
      this.buffer.append(itemWithMetadata);
      return this;
    }
    // case 3: item doesn't fit remaining capacity
    if (itemWithMetadata.capacity() > remainingCapacity) {
      // fill buffer tail with zeros and reset buffer offset to 0
      this.buffer.fill(ZERO).flip();
    }
    // write down current offset
    this.buffer.mark();
    // find items to be removed by moving read offset to next item offset
    while (this.buffer.offset + itemWithMetadata.capacity() > this.readOffset) {
      const itemToReadSize = this.buffer.readInt16(this.readOffset);
      this.readOffset += ITEM_METADATA_OVERHEAD + itemToReadSize;
    }
    // remove all bytes starting from offset to new read offset
    this.buffer.fill(ZERO, this.buffer.markedOffset, this.readOffset);
    // set offset to remembered and append item
    this.buffer.reset().append(itemWithMetadata);
    return this;
  }

  items(): BufferItem[] {
    // set offset to remembered and append item

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
