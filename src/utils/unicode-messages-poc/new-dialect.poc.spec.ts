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
    const sendMessageCommand: SendMessageCommand = {
      owner: owner,
      text: 'Hello, world',
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
});
