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
    if (this.isFirstAppend()) {
      return 0;
    }
    const totalItemSize = itemSize + ITEM_METADATA_OVERHEAD;
    const remainingCapacity = this.buffer.capacity() - this.buffer.offset;
    if (totalItemSize > remainingCapacity) {
      return 0;
    }
    return this.buffer.offset;
  }

  //   const nextItemOffset = this.nextItemOffset(item.capacity());
  //   if (nextItemOffset === 0) {
  //   this.buffer.fill(ZERO).flip();
  // }

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
    const nextItemOffset = this.nextItemOffset(item.capacity());
    if (this.isFirstAppend()) {
      this.readOffset = this.buffer.offset;
      this.buffer.append(itemWithMetadata);
      return this;
    }
    if (nextItemOffset === 0) {
      this.buffer.fill(ZERO).flip();
    }
    // case 1: this if first append cycle before buffer capacity reached
    if (this.buffer.offset > this.readOffset) {
      this.buffer.append(itemWithMetadata);
      return this;
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

  itemStart(metaOffset: number): number {
    return ITEM_METADATA_OVERHEAD + metaOffset;
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
      while (this.itemStart(readOffset) < this.buffer.capacity()) {
        const itemToReadSize = this.buffer.readInt16(readOffset);
        if (itemToReadSize === ZERO) {
          break;
        }
        const buffer = this.buffer.copy(
          this.itemStart(readOffset),
          this.itemStart(readOffset) + itemToReadSize,
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
    while (this.itemStart(readOffset) < this.buffer.offset) {
      const itemToReadSize = this.buffer.readInt16(readOffset);
      if (itemToReadSize === ZERO) {
        // TODO: handle w/o ZERO check
        break;
      }
      const buffer = this.buffer.copy(
        this.itemStart(readOffset),
        this.itemStart(readOffset) + itemToReadSize,
      );
      items.push({
        offset: readOffset,
        buffer,
      });
      readOffset += ITEM_METADATA_OVERHEAD + itemToReadSize;
    }

    return items;
  }

  private isFirstAppend() {
    return this.readOffset === -1 && this.buffer.offset === 0;
  }
}
