import { expect } from 'chai';
import {
  Dialect,
  Member,
  Message,
  SendMessageCommand,
} from './new-dialect.poc';
import { web3 } from '@project-serum/anchor';

describe('Test cyclic buffer', async () => {
  let owner: web3.Keypair;
  let writer: web3.Keypair;
  let members: [Member, Member];

  beforeEach(async () => {
    owner = web3.Keypair.generate();
    writer = web3.Keypair.generate();
    members = [
      {
        publicKey: owner.publicKey,
        scopes: [true, false], // owner, read-only
      },
      {
        publicKey: writer.publicKey,
        scopes: [false, true], // non-owner, read-write
      },
    ];
  });

  it('can send and read message', () => {
    // given
    const dialect = new Dialect(50, members);
    // when
    const text = 'Hello, world';

    const sendMessageCommand: SendMessageCommand = {
      owner: owner,
      text: text,
    };
    dialect.send(sendMessageCommand);
    const messages = dialect.messages(owner);
    // then
    const expectedMessages: Message[] = [
      {
        text: sendMessageCommand.text,
        owner: owner.publicKey,
      },
    ];
    expect(messages).to.be.deep.eq(expectedMessages);
  });

  it('can send and read russian message', () => {
    // given
    const dialect = new Dialect(50, members);
    // when
    const text = 'Привет, мир';

    const sendMessageCommand: SendMessageCommand = {
      owner: owner,
      text: text,
    };
    dialect.send(sendMessageCommand);
    const messages = dialect.messages(owner);
    // then
    const expectedMessages: Message[] = [
      {
        text: sendMessageCommand.text,
        owner: owner.publicKey,
      },
    ];
    expect(messages).to.be.deep.eq(expectedMessages);
  });

  it('can send and read multiple messages', () => {
    // given
    const dialect = new Dialect(1024, members);
    // when

    const texts = new Array(25)
      .fill(() => 0)
      .map((_, idx) => `Hello мир ${idx}`);

    texts.forEach((text, idx) => {
      const sendMessageCommand: SendMessageCommand = {
        owner,
        text: text,
      };
      dialect.send(sendMessageCommand);
      const messages = dialect.messages(owner);
      const expectedMessages: Message[] = texts
        .slice(0, idx + 1)
        .map((text) => ({
          text: text,
          owner: owner.publicKey,
        }));
      expect(messages).to.be.deep.eq(expectedMessages);
    });
  });

  it('can send and read emoji', () => {
    // given
    const dialect = new Dialect(50, members);
    // when
    const text = '😃';
    const sendMessageCommand: SendMessageCommand = {
      owner: owner,
      text: text,
    };
    dialect.send(sendMessageCommand);
    const messages = dialect.messages(owner);
    // then
    const expectedMessages: Message[] = [
      {
        text: sendMessageCommand.text,
        owner: owner.publicKey,
      },
    ];
    expect(messages).to.be.deep.eq(expectedMessages);
  });

  it('can send and read multiple messages w/ cyclic overwrite and decryption works', () => {
    // given
    const dialect = new Dialect(100, members);
    // when

    const texts = new Array(25)
      .fill(() => 0)
      .map((_, idx) => `Hello мир ${idx}`);

    texts.forEach((text, idx) => {
      const sendMessageCommand: SendMessageCommand = {
        owner,
        text: text,
      };
      dialect.send(sendMessageCommand);
      const messages = dialect.messages(owner);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.text).to.be.deep.eq(text);
    });
  });
});
