export type BufferItem = { offset: number; buffer: Uint8Array };

export const ITEM_METADATA_OVERHEAD = 2; // used to store item size, uint16

export class CyclicByteBuffer {
  readOffset!: number;
  writeOffset!: number;
  itemsCount!: number;
  private readonly buffer!: Uint8Array;

  constructor(
    readOffset: number,
    writeOffset: number,
    itemsCount: number,
    buffer: Uint8Array,
  ) {
    this.readOffset = readOffset;
    this.writeOffset = writeOffset;
    this.itemsCount = itemsCount;
    this.buffer = buffer;
  }

  static empty(size: number): CyclicByteBuffer {
    return new CyclicByteBuffer(0, 0, 0, new Uint8Array(size).fill(0));
  }

  raw(): Uint8Array {
    return this.buffer;
  }

  nextItemOffset() {
    return this.writeOffset;
  }

  append(itemWithoutMeta: Uint8Array) {
    const metadata = this.uint16ToBytes(itemWithoutMeta.length);
    const item = new Uint8Array([...metadata, ...itemWithoutMeta]);
    const newWriteOffset = this.mod(this.writeOffset + item.length);
    while (this.noSpaceAvailableFor(item.length)) {
      this.eraseOldestItem();
    }
    this.writeNewItem(item, newWriteOffset);
  }

  uint16ToBytes(value: number) {
    return new Uint8Array([(value & 0xff00) >>> 8, value & 0x00ff]);
  }

  uint16FromBytes(bytes: Uint8Array) {
    return (bytes[0] << 8) | bytes[1];
  }

  items(): BufferItem[] {
    let readOffset = this.readOffset;
    let itemsRead = 0;
    const acc: BufferItem[] = [];
    while (this.canRead(itemsRead)) {
      const itemSize = this.uint16FromBytes(
        this.read(ITEM_METADATA_OVERHEAD, readOffset),
      );
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

  private writeNewItem(itemWithMetadata: Uint8Array, newWriteOffset: number) {
    this.write(itemWithMetadata, this.writeOffset);
    this.writeOffset = newWriteOffset;
    this.itemsCount++;
  }

  private noSpaceAvailableFor(itemSize: number) {
    return this.getAvailableSpace() < itemSize;
  }

  private eraseOldestItem() {
    const itemSize = this.readItemSize();
    this.write(this.zeros(itemSize), this.readOffset);
    this.readOffset = this.mod(this.readOffset + itemSize);
    this.itemsCount--;
  }

  private zeros(oldestItemSize: number) {
    return new Uint8Array(new Array(oldestItemSize).fill(0));
  }

  private readItemSize(): number {
    const readOffset = this.readOffset;
    const tailSize = this.buffer.length - readOffset;
    if (tailSize >= ITEM_METADATA_OVERHEAD) {
      return this.uint16FromBytes(
        new Uint8Array([
          this.buffer[this.readOffset],
          this.buffer[this.readOffset + 1],
        ]),
      );
    }
    return this.uint16FromBytes(
      new Uint8Array([this.buffer[this.readOffset], this.buffer[0]]),
    );
  }

  // simplification for rust adoption
  private readItemSizeBytes(): Uint8Array {
    const tailSize = this.buffer.length - this.readOffset;
    if (tailSize >= ITEM_METADATA_OVERHEAD) {
      return new Uint8Array([
        this.buffer[this.readOffset],
        this.buffer[this.readOffset + 1],
      ]);
    }
    return new Uint8Array([this.buffer[this.readOffset], this.buffer[0]]);
  }

  private read(size: number, offset: number): Uint8Array {
    const tailSize = this.buffer.length - offset;
    if (tailSize >= size) {
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
