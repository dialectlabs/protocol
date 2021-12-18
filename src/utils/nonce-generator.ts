export const NONCE_SIZE_BYTES = 24;

/**
 * Generates 24 byte nonce from message counter.
 * Sender and receiver should keep a counter of messages and increment it for each message.
 */
export function generateNonce(messageCounter: number): Uint8Array {
  const nonce = new Uint8Array(Array(NONCE_SIZE_BYTES).fill(0));
  let messageCounterModule = Math.abs(messageCounter);
  let nonceByteIndex = 0;
  while (messageCounterModule) {
    nonce[nonceByteIndex++] = messageCounterModule % 10;
    messageCounterModule = Math.floor(messageCounterModule / 10);
  }
  return nonce.reverse();
}
