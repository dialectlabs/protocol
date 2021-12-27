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
        this.mod(readOffset + ITEM_METADATA_OVERHEAD),
      );
      acc.push({
        offset: readOffset,
        buffer: item,
      });
      readOffset = this.mod(readOffset + ITEM_METADATA_OVERHEAD + itemSize);
      itemsRead++;
    }
    return acc;
  }

  private mod(n: number) {
    return n % this.buffer.length;
  }

  private canRead(readCount: number) {
    return readCount < this.itemsCount;
  }

  private appendInternal(item: Uint8Array) {
    const newWriteOffset = this.mod(this.writeOffset + item.length);
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
    const itemSize = ITEM_METADATA_OVERHEAD + this.read(2, this.readOffset)[1];
    this.write(this.zeros(itemSize), this.readOffset);
    this.readOffset = this.mod(this.readOffset + itemSize);
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
    const freeTailBytes = this.mod(this.buffer.length - offset);
    const numBytesToWriteToTail = Math.min(data.length, freeTailBytes);
    const writeToTail = data.slice(0, numBytesToWriteToTail);
    this.buffer.set(writeToTail, offset);
    const writeToHead = data.slice(numBytesToWriteToTail, data.length);
    this.buffer.set(writeToHead, 0);
  }

  private getAvailableSpace() {
    if (this.itemsCount === 0) {
      return this.buffer.length;
    }
    return this.mod(this.readOffset - this.writeOffset + this.buffer.length);
  }
}
