const NUL_CHAR = 0;

export class SerializationOverflowError extends Error {
  constructor(maxSize: number, text: string) {
    super(`Cannot serialize: ${text} exceeds max size '${maxSize}'`);
  }
}

export function serializeText(text: string, binarySize: number): Uint8Array {
  if (text.length > binarySize) {
    throw new SerializationOverflowError(binarySize, text);
  }
  const intArray = Array(binarySize).fill(NUL_CHAR);
  const charArray = Buffer.from(text);
  for (let i = 0; i < charArray.length; i++) {
    intArray[i] = charArray[i];
  }
  return new Uint8Array(intArray);
}

export function deserializeText(bytes: Uint8Array): string {
  const textEndIdx = bytes.indexOf(NUL_CHAR);
  if (textEndIdx === -1) {
    return new TextDecoder().decode(bytes);
  }
  return new TextDecoder().decode(bytes.slice(0, textEndIdx));
}
