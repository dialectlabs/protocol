import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import {
  createDialect,
  createMetadata,
  DialectAccount,
  Member,
  Metadata,
  programs,
  Wallet_,
  idl,
  sendMessage,
  subscribeUser,
} from '..';

const NETWORK_NAME = 'localnet';
const local = new web3.Connection(
  programs['localnet'].clusterAddress,
  'recent'
);

const setup = async (
  n: number
): Promise<[anchor.Program, web3.Keypair[], Member[]]> => {
  // create keypairs & wallet
  const keypairs = createKeypairs(n);
  const wallet = Wallet_.embedded(keypairs[0].secretKey);

  // configure anchor
  anchor.setProvider(
    new anchor.Provider(local, wallet, anchor.Provider.defaultOptions())
  );
  const program = new anchor.Program(
    idl as anchor.Idl,
    new anchor.web3.PublicKey(programs[NETWORK_NAME].programAddress)
  );

  // fund keypairs
  await fundKeypairs(program, keypairs);

  const members = keypairs.map(
    (kp: web3.Keypair) =>
      ({
        publicKey: kp.publicKey,
        scopes: [true, true],
      } as Member)
  );

  return [program, keypairs, members];
};

const createKeypairs = (n: number): web3.Keypair[] => {
  return new Array(n).fill(0).map((_) => web3.Keypair.generate());
};

const fundKeypairs = async (
  program: anchor.Program,
  keypairs: web3.Keypair[],
  amount: number | undefined = 10 * web3.LAMPORTS_PER_SOL
): Promise<void> => {
  await Promise.all(
    keypairs.map(async (keypair) => {
      const fromAirdropSignature = await program.provider.connection.requestAirdrop(
        keypair.publicKey,
        amount
      );
      await program.provider.connection.confirmTransaction(
        fromAirdropSignature
      );
    })
  );
};

const createMetadatas = async (
  program: anchor.Program,
  keypairs: Keypair[]
): Promise<Metadata[]> => {
  const metadatas = await Promise.all(
    keypairs.map(async (keypair, idx) => {
      return await createMetadata(program, keypair, `${idx}`.repeat(32));
    })
  );
  return metadatas;
};

const subscribeUsers = async (
  program: anchor.Program,
  dialect: DialectAccount,
  keypairs: web3.Keypair[]
): Promise<Metadata[]> => {
  const metadatas: Metadata[] = [];
  await Promise.all(
    keypairs.map(async (keypair) => {
      metadatas.push(
        await subscribeUser(program, dialect, keypair.publicKey, keypair)
      );
    })
  );
  return metadatas;
};

const sendMessages = async (
  program: anchor.Program,
  dialect: DialectAccount,
  keypairs: web3.Keypair[]
): Promise<void> => {
  const numMessages = 8;
  const texts = Array(numMessages)
    .fill(0)
    .map((_, i) => `Hello, world! ${i}`);
  for (let i = 0; i < numMessages; i++) {
    console.log(`sending message ${i}...`);
    const message = await sendMessage(
      program,
      dialect,
      keypairs[i % keypairs.length],
      texts[i]
    );
  }
};

const index = async (): Promise<void> => {
  const numMembers = 2;
  const [program, keypairs, members] = await setup(numMembers);
  let metadatas = await createMetadatas(program, keypairs);
  const dialect = await createDialect(program, keypairs[0], members);
  metadatas = await subscribeUsers(program, dialect, keypairs);
  await sendMessages(program, dialect, keypairs);
};

index();
