import { Keypair, PublicKey } from '@solana/web3.js';
import { CyclicByteBuffer } from './cyclic-bytebuffer.poc';
import ByteBuffer from 'bytebuffer';
import { ecdhEncrypt, ENCRYPTION_OVERHEAD_BYTES } from '../ecdh-encryption';
import { generateNonce } from '../nonce-generator';

export interface Member {
  publicKey: PublicKey;
  // [Admin, Write]. [false, false] implies read-only
  scopes: [boolean, boolean];
}

export interface SendMessageCommand {
  owner: Keypair;
  text: string;
}

export interface Message {
  owner: PublicKey;
  text: string;
}

export class Dialect {
  members!: [Member, Member];
  buffer!: CyclicByteBuffer;
  textEncoder: TextEncoder = new TextEncoder();
  textDecoder: TextDecoder = new TextDecoder();

  constructor(size: number, members: [Member, Member]) {
    this.buffer = new CyclicByteBuffer(size);
    this.members = members;
  }

  nextMessageOffset(encodedTextSize: number): number {
    const serializedSize = 4 + 4 + encodedTextSize + ENCRYPTION_OVERHEAD_BYTES;
    return this.buffer.nextItemOffset(serializedSize);
  }

  send({ owner, text }: SendMessageCommand): void {
    const { index: ownerMemberIndex } = this.findMember(owner.publicKey);
    const {
      member: { publicKey: otherMemberPk },
    } = this.findOtherMember(owner.publicKey);
    const encodedText = this.textEncoder.encode(text);
    const nextMessageOffset = this.nextMessageOffset(encodedText.length);
    const encryptedText = ecdhEncrypt(
      encodedText,
      {
        secretKey: owner.secretKey,
        publicKey: owner.publicKey.toBytes(),
      },
      otherMemberPk.toBuffer(),
      generateNonce(nextMessageOffset),
    );
    const serializedMessage = new ByteBuffer()
      .writeInt(ownerMemberIndex)
      .append(encryptedText)
      .flip();
    this.buffer.append(serializedMessage);
  }

  messages(me: Keypair): Message[] {
    const {
      member: { publicKey: otherMemberPk },
    } = this.findOtherMember(me.publicKey);
    const messages: Message[] = this.buffer
      .items()
      .map(({ buffer: serializedMessage, offset }) => {
        const ownerMemberIndex = serializedMessage.readInt();
        const encryptedText = new Uint8Array(serializedMessage.toArrayBuffer());
        const encodedText = ecdhEncrypt(
          encryptedText,
          {
            secretKey: me.secretKey,
            publicKey: me.publicKey.toBytes(),
          },
          otherMemberPk.toBuffer(),
          generateNonce(offset),
        );
        const text = this.textDecoder.decode(encodedText);
        const ownerMember = this.members[ownerMemberIndex];
        return {
          owner: ownerMember.publicKey,
          text,
        };
      });
    return messages;
  }

  private findMember(memberPk: PublicKey): {
    member: Member;
    index: number;
  } {
    const member = this.members
      .map((member, index) => ({
        member,
        index,
      }))
      .find(({ member }) => member.publicKey.equals(memberPk));
    if (!member) {
      throw new Error('Should not happen');
    }
    return member;
  }

  private findOtherMember(memberPk: PublicKey): {
    member: Member;
    index: number;
  } {
    const otherMember = this.members
      .map((member, index) => ({
        member,
        index,
      }))
      .find(({ member }) => !member.publicKey.equals(memberPk));
    if (!otherMember) {
      throw new Error('Should not happen');
    }
    return otherMember;
  }
}
