import { expect } from 'chai';
import { deserializeText, serializeText } from './text-serde';

describe('Text serialization/deserialization test', async () => {

  it('should return desired size after serialization when text is larger than size', () => {
    // given
    const beforeSerDe = '123';
    // when
    const serialized = serializeText(beforeSerDe, 2);
    // then
    expect(serialized).to.be.deep.eq(new Uint8Array([
      49, 50,
    ]));
  });

  it('should return desired size after serialization when text is smaller than size', () => {
    // given
    const beforeSerDe = '12';
    // when
    const serialized = serializeText(beforeSerDe, 3);
    // then
    expect(serialized).to.be.deep.eq(new Uint8Array([
      49, 50, 0,
    ]));
  });

  it('should return desired size after serialization when text is equal to size', () => {
    // given
    const beforeSerDe = '123';
    // when
    const serialized = serializeText(beforeSerDe, 3);
    // then
    expect(serialized).to.be.deep.eq(new Uint8Array([
      49, 50, 51,
    ]));
  });

  it('should correctly serialize and deserialize message when text dont exceed size', () => {
    // given
    const beforeSerDe = '123456789';
    // when
    const serialized = serializeText(beforeSerDe, 128);
    const deserialized = deserializeText(serialized);
    // then
    expect(deserialized).to.eq(beforeSerDe);
  });


  it('should correctly serialize and deserialize message when text exceed size', () => {
    // given
    const beforeSerDe = '123';
    // when
    const serialized = serializeText(beforeSerDe, 2);
    const deserialized = deserializeText(serialized);
    // then
    expect(deserialized).to.eq('12');
  });
});
