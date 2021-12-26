export type BufferItem = { offset: number; buffer: Uint8Array };

export const ZERO = 0;
export const ITEM_METADATA_OVERHEAD = 2; // used to store item size, uint16

export class CyclicByteBuffer {
  writeOffset = 0;
  itemsCount = 0;
  readOffset = 0;
  private readonly buffer!: Uint8Array;

  constructor(size: number) {
    this.buffer = new Uint8Array(size).fill(ZERO);
  }

  raw(): Uint8Array {
    return this.buffer;
  }

  nextItemOffset() {
    return this.writeOffset;
  }

  // TODO: anyway limit message size to be << buffer size? or should add additional logic handle this...
  append(item: Uint8Array) {
    const itemWithMetadata = new Uint8Array([0, item.length, ...item]); // TODO: correctly write metadata as uint16

    console.log(item.length);
    const newWriteOffset =
      (this.writeOffset + itemWithMetadata.length) % this.buffer.length;

    while (this.getAvailableSpace() < itemWithMetadata.length) {
      const oldestItemSize = this.read(2, this.readOffset)[1]; // TODO: correctly read metadata as uint16
      const tailSize =
        (this.buffer.length - this.readOffset) % this.buffer.length;
      const oldestItemWithMetadataSize =
        oldestItemSize + ITEM_METADATA_OVERHEAD;

      const writeToTail = new Array(
        Math.min(oldestItemWithMetadataSize, tailSize),
      ).fill(0);
      if (writeToTail.length > 0) {
        this.buffer.set(writeToTail, this.readOffset);
      }
      const writeToHead = new Array(
        oldestItemWithMetadataSize - writeToTail.length,
      ).fill(0);
      if (writeToHead.length > 0) {
        this.buffer.set(writeToHead, 0);
      }
      const newReadOffset =
        (this.readOffset + oldestItemWithMetadataSize) % this.buffer.length;
      this.readOffset = newReadOffset;
      this.itemsCount--;
    }

    const remainingCapacity = this.buffer.length - this.writeOffset;
    const writeToTail = itemWithMetadata.slice(
      0,
      Math.min(itemWithMetadata.length, remainingCapacity),
    );
    this.buffer.set(writeToTail, this.writeOffset);

    const writeToHead = itemWithMetadata.slice(
      Math.min(itemWithMetadata.length, remainingCapacity),
      itemWithMetadata.length,
    );
    this.buffer.set(writeToHead, 0);
    this.writeOffset = newWriteOffset;
    this.itemsCount++;
  }

  items(): BufferItem[] {
    let readStart = this.readOffset;
    let readCount = 0;
    const acc: BufferItem[] = [];
    while (readCount < this.itemsCount) {
      const size = this.read(ITEM_METADATA_OVERHEAD, readStart)[1]; // TODO: correctly read metadata as uint16
      const itemWithMetaSize = ITEM_METADATA_OVERHEAD + size;
      const item = this.read(
        size,
        (readStart + ITEM_METADATA_OVERHEAD) % this.buffer.length,
      );
      acc.push({
        offset: readStart,
        buffer: item,
      });
      readStart = (readStart + itemWithMetaSize) % this.buffer.length;
      readCount++;
    }
    return acc;
  }

  private read(n: number, offset: number): Uint8Array {
    const readFromTail = this.buffer.length - offset;
    if (readFromTail >= n) {
      return this.buffer.slice(offset, offset + n);
    }
    const tail: Uint8Array = this.buffer.slice(offset, this.buffer.length);
    const head: Uint8Array = this.buffer.slice(0, n - tail.length);
    return new Uint8Array([...tail, ...head]);
  }

  private getAvailableSpace() {
    if (this.itemsCount === 0) {
      return this.buffer.length;
    }
    return (
      (this.readOffset - this.writeOffset + this.buffer.length) %
      this.buffer.length
    );
  }
}
