import type { Member } from './index';
import {
  generateRandomNonceWithPrefix,
  NONCE_SIZE_BYTES,
} from '../utils/nonce-generator';
import {
  Curve25519KeyPair,
  ecdhDecrypt,
  ecdhEncrypt,
  Ed25519Key,
} from '../utils/ecdh-encryption';
import type * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

export interface TextSerde {
  serialize(text: string): Uint8Array;

  deserialize(bytes: Uint8Array): string;
}

export class EncryptedTextSerde implements TextSerde {
  private readonly unencryptedTextSerde: UnencryptedTextSerde =
    new UnencryptedTextSerde();

  constructor(
    private readonly encryptionProps: EncryptionProps,
    private readonly members: Member[],
  ) {}

  deserialize(bytes: Uint8Array): string {
    const encryptionNonce = bytes.slice(0, NONCE_SIZE_BYTES);
    const encryptedText = bytes.slice(NONCE_SIZE_BYTES, bytes.length);
    const otherMember = this.findOtherMember(
      new PublicKey(this.encryptionProps.ed25519PublicKey),
    );
    const encodedText = ecdhDecrypt(
      encryptedText,
      this.encryptionProps.diffieHellmanKeyPair,
      otherMember.publicKey.toBytes(),
      encryptionNonce,
    );
    return this.unencryptedTextSerde.deserialize(encodedText);
  }

  serialize(text: string): Uint8Array {
    const publicKey = new PublicKey(this.encryptionProps.ed25519PublicKey);
    const senderMemberIdx = this.findMemberIdx(publicKey);
    const textBytes = this.unencryptedTextSerde.serialize(text);
    const otherMember = this.findOtherMember(publicKey);
    const encryptionNonce = generateRandomNonceWithPrefix(senderMemberIdx);
    const encryptedText = ecdhEncrypt(
      textBytes,
      this.encryptionProps.diffieHellmanKeyPair,

      otherMember.publicKey.toBytes(),
      encryptionNonce,
    );
    return new Uint8Array([...encryptionNonce, ...encryptedText]);
  }

  private findMemberIdx(member: anchor.web3.PublicKey) {
    const memberIdx = this.members.findIndex((it) =>
      it.publicKey.equals(member),
    );
    if (memberIdx === -1) {
      throw new Error('Expected to have other member');
    }
    return memberIdx;
  }

  private findOtherMember(member: anchor.web3.PublicKey) {
    const otherMember = this.members.find((it) => !it.publicKey.equals(member));
    if (!otherMember) {
      throw new Error('Expected to have other member');
    }
    return otherMember;
  }
}

export class UnencryptedTextSerde implements TextSerde {
  deserialize(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
  }

  serialize(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }
}

export type DialectAttributes = {
  encrypted: boolean;
  members: Member[];
};

export interface EncryptionProps {
  diffieHellmanKeyPair: Curve25519KeyPair;
  ed25519PublicKey: Ed25519Key;
}

export class TextSerdeFactory {
  static create(
    { encrypted, members }: DialectAttributes,
    encryptionProps?: EncryptionProps,
  ): TextSerde {
    if (!encrypted) {
      return new UnencryptedTextSerde();
    }
    if (encrypted && encryptionProps) {
      return new EncryptedTextSerde(encryptionProps, members);
    }
    throw new Error('Cannot proceed without encryptionProps');
  }
}
