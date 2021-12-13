const NUL_CHAR = 0;


export function serializeText(text: string, sizeBytes: number): Uint8Array {
  const alignedToSize = text.substring(0, sizeBytes);
  const intArray = Array(sizeBytes).fill(NUL_CHAR);
  const charArray = Buffer.from(alignedToSize);
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
