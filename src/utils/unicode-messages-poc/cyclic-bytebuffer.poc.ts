import ByteBuffer from 'bytebuffer';

export type BufferItem = { offset: number; buffer: ByteBuffer };

const ITEM_SEPARATOR = 0;

export class CyclicByteBuffer {
  readonly buffer!: ByteBuffer;

  // readonly offset: number; // TODO: will need this field in rust implementation

  constructor(size: number) {
    this.buffer = new ByteBuffer(size).fill(0).flip();
  }

  append(item: ByteBuffer) {
    if (
      this.buffer.offset !== ITEM_SEPARATOR &&
      this.buffer.offset < this.buffer.capacity()
    ) {
      // write separator byte if buffer contains items and has space
      this.buffer.writeByte(ITEM_SEPARATOR);
    }
    // check whether item can be appended to buffer starting from current offset
    if (this.buffer.offset + item.limit > this.buffer.capacity()) {
      // item doesn't fit the buffer capacity => will append to buffer start
      this.buffer.fill(ITEM_SEPARATOR).flip(); // fill tail with zeros
    }
    // simply append new message to buffer (potentially causes overlap with previous message)
    // also mark current offset
    this.buffer.append(item);
    item.flip();
    // handle case when we if we hit the end of the buffer
    if (this.buffer.offset === this.buffer.capacity()) {
      // hit the end of the buffer
      this.buffer.reset();
      return this;
    }
    // buffer state may be inconsistent, because we've partially overwritten the message
    // the part of overwritten message may be still in the buffer, need to set '0' to it
    this.buffer.mark();
    for (
      let byte = this.buffer.readByte();
      byte !== ITEM_SEPARATOR;
      byte = this.buffer.readByte()
    ) {
      // lookup bytes one by one until find a item separator
    }
    // item separator found, cleanup inconsistency
    this.buffer
      .fill(ITEM_SEPARATOR, this.buffer.markedOffset, this.buffer.offset)
      .reset();
    return this;
  }

  items(): BufferItem[] {
    this.buffer.mark();
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
