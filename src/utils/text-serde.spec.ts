import { expect } from 'chai';
import { deserializeText, SerializationOverflowError, serializeText } from './text-serde';

describe('Text serialization/deserialization test', async () => {

  it('should fail to serialize when text len is larger than provided size', () => {
    // given
    const beforeSerDe = '123';
    // when/then
    expect(() => serializeText(beforeSerDe, 2)).to.throw(SerializationOverflowError);
  });

  it('should return desired size after serialization when text len is smaller than size', () => {
    // given
    const beforeSerDe = '12';
    // when
    const serialized = serializeText(beforeSerDe, 3);
    // then
    expect(serialized).to.be.deep.eq(new Uint8Array([
      49, 50, 0,
    ]));
  });

  it('should return desired size after serialization when text len is equal to size', () => {
    // given
    const beforeSerDe = '123';
    // when
    const serialized = serializeText(beforeSerDe, 3);
    // then
    expect(serialized).to.be.deep.eq(new Uint8Array([
      49, 50, 51,
    ]));
  });

  it('should correctly serialize and deserialize message when text len dont exceed size', () => {
    // given
    const beforeSerDe = '123456789';
    // when
    const serialized = serializeText(beforeSerDe, 128);
    const deserialized = deserializeText(serialized);
    // then
    expect(deserialized).to.eq(beforeSerDe);
  });
});
