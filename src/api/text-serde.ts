import type { Member } from './index';
import {
  generateRandomNonceWithPrefix,
  NONCE_SIZE_BYTES,
} from '../utils/nonce-generator';
import { ecdhDecrypt, ecdhEncrypt } from '../utils/ecdh-encryption';
import type * as anchor from '@project-serum/anchor';

export interface TextSerde {
  serialize(text: string): Uint8Array;

  deserialize(bytes: Uint8Array): string;
}

export class EncryptedTextSerde implements TextSerde {
  private readonly unencryptedTextSerde: UnencryptedTextSerde =
    new UnencryptedTextSerde();

  constructor(
    private readonly user: anchor.web3.Keypair,
    private readonly members: Member[],
  ) {}

  deserialize(bytes: Uint8Array): string {
    const encryptionNonce = bytes.slice(0, NONCE_SIZE_BYTES);
    const encryptedText = bytes.slice(NONCE_SIZE_BYTES, bytes.length);
    const otherMember = this.findOtherMember(this.user.publicKey);
    const encodedText = ecdhDecrypt(
      encryptedText,
      {
        secretKey: this.user.secretKey,
        publicKey: this.user.publicKey.toBytes(),
      },
      otherMember.publicKey.toBuffer(),
      encryptionNonce,
    );
    return this.unencryptedTextSerde.deserialize(encodedText);
  }

  serialize(text: string): Uint8Array {
    const senderMemberIdx = this.findMemberIdx(this.user.publicKey);
    const textBytes = this.unencryptedTextSerde.serialize(text);
    const otherMember = this.findOtherMember(this.user.publicKey);
    const encryptionNonce = generateRandomNonceWithPrefix(senderMemberIdx);
    const encryptedText = ecdhEncrypt(
      textBytes,
      {
        secretKey: this.user.secretKey,
        publicKey: this.user.publicKey.toBytes(),
      },
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

export class TextSerdeFactory {
  static create(
    { encrypted, members }: DialectAttributes,
    user?: anchor.web3.Keypair,
  ): TextSerde {
    if (!encrypted) {
      return new UnencryptedTextSerde();
    }
    if (encrypted && user) {
      return new EncryptedTextSerde(user, members);
    }
    throw new Error('Cannot proceed with encrypted dialect w/o user identity');
  }
}
