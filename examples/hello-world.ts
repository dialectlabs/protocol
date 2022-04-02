import * as anchor from '@project-serum/anchor';
import { Idl, Provider } from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  createDialect,
  getDialectForMembers,
  idl as dialectIdl,
  Member,
  programs,
  sendMessage,
  Wallet_,
} from '../src';

const NETWORK_NAME = 'localnet';
const local = new web3.Connection(
  programs[NETWORK_NAME].clusterAddress,
  'recent',
);

const users = [Keypair.generate(), Keypair.generate()];
const wallet = Wallet_.embedded(users[0].secretKey);
const program = new anchor.Program(
  dialectIdl as Idl,
  new PublicKey(programs[NETWORK_NAME].programAddress),
  new Provider(local, wallet, anchor.Provider.defaultOptions()),
);

async function fundUsers(
  keypairs: Keypair[],
  amount: number | undefined = 10 * web3.LAMPORTS_PER_SOL,
): Promise<void> {
  await Promise.all(
    keypairs.map(async (keypair) => {
      const fromAirdropSignature =
        await program.provider.connection.requestAirdrop(
          keypair.publicKey,
          amount,
        );
      await program.provider.connection.confirmTransaction(
        fromAirdropSignature,
      );
    }),
  );
}

const main = async (): Promise<void> => {
  await fundUsers(users);
  const [user1, user2] = users;
  const dialectMembers: Member[] = [
    {
      publicKey: user1.publicKey,
      scopes: [true, true],
    },
    {
      publicKey: user2.publicKey,
      scopes: [false, true],
    },
  ];
  const user1Dialect = await createDialect(
    program,
    user1,
    dialectMembers,
    false,
  );
  await sendMessage(program, user1Dialect, user1, 'Hello dialect!');
  const { dialect: user2Dialect } = await getDialectForMembers(
    program,
    dialectMembers,
    user2,
  );
  console.log(JSON.stringify(user2Dialect.messages));
};

main();
