import ByteBuffer from 'bytebuffer';

export type BufferItem = { offset: number; buffer: ByteBuffer };
export type Sizing = { offset: number; capacity: number };

const ZERO = 0;
const ITEM_CAPACITY_SIZE = 2;

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

  // TODO: anyway limit message size to be << buffer size?
  append(item: ByteBuffer) {
    const sizedItem = new ByteBuffer(ITEM_CAPACITY_SIZE + item.capacity())
      .writeShort(item.capacity())
      .append(item)
      .flip();
    item.reset();
    // boundary case 1: write till the end of buffer
    if (this.buffer.offset + sizedItem.limit === this.buffer.capacity()) {
      // set read offset if not set
      if (this.readOffset === -1) {
        this.readOffset = this.buffer.offset;
      }
      // simply write and reset buffer offset and reset buffer offset to 0
      this.buffer.append(sizedItem).reset();
      return;
    }
    // check item exceeds capacity
    if (this.buffer.offset + sizedItem.limit > this.buffer.capacity()) {
      // fill buffer tail with zeros and reset buffer offset to 0
      this.buffer.fill(ZERO).reset();
    }
    // set read offset if not set
    if (this.readOffset === -1) {
      this.readOffset = this.buffer.offset;
    }
    // handle case when it's inittial buffer fill
    if (this.buffer.offset > this.readOffset) {
      // read before write
      this.buffer.append(sizedItem);
      return;
    }

    // handle write before read
    this.buffer.mark();
    for (
      let itemToReadSize = this.buffer.readShort(this.readOffset);
      this.buffer.offset + sizedItem.limit <= this.readOffset;
      this.readOffset += itemToReadSize
    ) {
      // определяем короче сколько элеменотов надо подтереть, фактически дефайним новый рид оффсет
    }
    // удаляем нах все начиная с райт оффсет по рид оффсет
    this.buffer.fill(ZERO, this.buffer.offset, this.readOffset).reset();
    this.buffer.append(sizedItem);
    return this;
  }

  items(): BufferItem[] {
    if (this.readOffset === -1) {
      return [];
    }

    // r ... w...

    // ...w ... r...

    for (
      let itemToReadSize = this.buffer.readShort(this.readOffset);
      this.buffer.offset % this.buffer.capacity() <= this.readOffset;
      this.readOffset += itemToReadSize
    ) {
      // определяем короче сколько элеменотов надо подтереть, фактически дефайним новый рид оффсет
    }

    if (this.readOffset < this.buffer.offset) this.buffer.mark();
    const items: BufferItem[] = []; // accumulator for items
    let item = new ByteBuffer();
    let itemOffset = 0; // item offset handle
    // read bytes one by one and parse individual items
    for (let i = 0; i < this.buffer.limit; i++) {
      const byte = this.buffer.readByte(i);
      if (item.offset > 0 && byte === 0) {
        // item non empty and we met separator => item is parsed, add it to accumulator
        items.push({
          offset: itemOffset,
          buffer: item.flip().copy(),
        });
        item = new ByteBuffer(); // initialize buffer for next item
        continue;
      }
      if (item.offset === 0 && byte !== 0) {
        // the firs byte for item is found => remember item offset
        itemOffset = i;
      }
      if (byte !== 0) {
        // simply add byte to item buffer
        item.writeByte(byte);
      }
    }
    if (item.offset > 0) {
      // buffer non empty
      items.push({
        offset: itemOffset,
        buffer: item.flip().copy(),
      });
    }
    this.buffer.reset();
    return items;
  }
}
