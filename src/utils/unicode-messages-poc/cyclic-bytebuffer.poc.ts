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
    this.appendInternal(itemWithMetadata);
  }

  items(): BufferItem[] {
    let readOffset = this.readOffset;
    let itemsRead = 0;
    const acc: BufferItem[] = [];
    while (this.canRead(itemsRead)) {
      const itemSize = this.read(ITEM_METADATA_OVERHEAD, readOffset)[1]; // TODO: correctly read metadata as uint16
      const item = this.read(
        itemSize,
        (readOffset + ITEM_METADATA_OVERHEAD) % this.buffer.length,
      );
      acc.push({
        offset: readOffset,
        buffer: item,
      });
      readOffset =
        (readOffset + ITEM_METADATA_OVERHEAD + itemSize) % this.buffer.length;
      itemsRead++;
    }
    return acc;
  }

  private canRead(readCount: number) {
    return readCount < this.itemsCount;
  }

  private appendInternal(item: Uint8Array) {
    const newWriteOffset =
      (this.writeOffset + item.length) % this.buffer.length;
    while (this.noSpaceAvailableFor(item)) {
      this.eraseOldestItem();
    }
    this.writeNewItem(item, newWriteOffset);
  }

  private writeNewItem(itemWithMetadata: Uint8Array, newWriteOffset: number) {
    this.write(itemWithMetadata, this.writeOffset);
    this.writeOffset = newWriteOffset;
    this.itemsCount++;
  }

  private noSpaceAvailableFor(item: Uint8Array) {
    return this.getAvailableSpace() < item.length;
  }

  private eraseOldestItem() {
    const oldestItemSize =
      ITEM_METADATA_OVERHEAD + this.read(2, this.readOffset)[1];
    this.write(this.zeros(oldestItemSize), this.readOffset);
    this.readOffset = (this.readOffset + oldestItemSize) % this.buffer.length;
    this.itemsCount--;
  }

  private zeros(oldestItemSize: number) {
    return new Uint8Array(new Array(oldestItemSize).fill(0));
  }

  private read(size: number, offset: number): Uint8Array {
    const readFromTail = this.buffer.length - offset;
    if (readFromTail >= size) {
      return this.buffer.slice(offset, offset + size);
    }
    const tail: Uint8Array = this.buffer.slice(offset, this.buffer.length);
    const head: Uint8Array = this.buffer.slice(0, size - tail.length);
    return new Uint8Array([...tail, ...head]);
  }

  private write(data: Uint8Array, offset: number) {
    const remainingCapacity =
      (this.buffer.length - offset) % this.buffer.length;
    const numBytesToWriteToTail = Math.min(data.length, remainingCapacity);
    const writeToTail = data.slice(0, numBytesToWriteToTail);
    this.buffer.set(writeToTail, offset);
    const writeToHead = data.slice(numBytesToWriteToTail, data.length);
    this.buffer.set(writeToHead, 0);
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
