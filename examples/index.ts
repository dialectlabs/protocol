import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import {
  createDialect,
  createMetadata,
  DEVICE_TOKEN_LENGTH,
  DialectAccount,
  getDialectForMembers,
  idl,
  Member,
  Metadata,
  programs,
  sendMessage,
  subscribeUser,
  updateDeviceToken,
  Wallet_,
} from '..';

const NETWORK_NAME = 'localnet';
const local = new web3.Connection(
  programs['localnet'].clusterAddress,
  'recent',
);

const dialectPublicKey = process?.env?.DIALECT_PUBLIC_KEY ? new web3.PublicKey(process?.env?.DIALECT_PUBLIC_KEY) : (web3.Keypair.generate()).publicKey;

const setup = async (
  n: number,
): Promise<[anchor.Program, web3.Keypair[], Member[]]> => {
  // create keypairs & wallet
  const keypairs = createKeypairs(n);
  const wallet = Wallet_.embedded(keypairs[0].secretKey);

  // configure anchor
  anchor.setProvider(
    new anchor.Provider(local, wallet, anchor.Provider.defaultOptions()),
  );
  const program = new anchor.Program(
    idl as anchor.Idl,
    new anchor.web3.PublicKey(programs[NETWORK_NAME].programAddress),
  );

  // fund keypairs
  await fundKeypairs(program, keypairs);

  const members = keypairs.map(
    (kp: web3.Keypair) =>
      ({
        publicKey: kp.publicKey,
        scopes: [true, true],
      } as Member),
  );

  return [program, keypairs, members];
};

const createKeypairs = (n: number): web3.Keypair[] => {
  return new Array(n).fill(0).map((_) => web3.Keypair.generate());
};

const fundKeypairs = async (
  program: anchor.Program,
  keypairs: web3.Keypair[],
  amount: number | undefined = 10 * web3.LAMPORTS_PER_SOL,
): Promise<void> => {
  await Promise.all(
    keypairs.map(async (keypair) => {
      const fromAirdropSignature = await program.provider.connection.requestAirdrop(
        keypair.publicKey,
        amount,
      );
      await program.provider.connection.confirmTransaction(
        fromAirdropSignature,
      );
    }),
  );
};

const createMetadatas = async (
  program: anchor.Program,
  keypairs: Keypair[],
): Promise<Metadata[]> => {
  const metadatas = await Promise.all(
    keypairs.map(async (keypair) => {
      return await createMetadata(program, keypair);
    }),
  );
  return metadatas;
};

const subscribeUsers = async (
  program: anchor.Program,
  dialect: DialectAccount,
  keypairs: web3.Keypair[],
): Promise<Metadata[]> => {
  const metadatas: Metadata[] = [];
  await Promise.all(
    keypairs.map(async (keypair, idx) => {
      await subscribeUser(program, dialect, keypair.publicKey, keypair);
      metadatas.push(
        await updateDeviceToken(program, keypair, dialectPublicKey, `${idx}`.repeat(DEVICE_TOKEN_LENGTH)),
      );
    }),
  );
  return metadatas;
};

const sendMessages = async (
  program: anchor.Program,
  keypairs: web3.Keypair[],
  members: Member[],
): Promise<void> => {
  const numMessages = 8;
  const texts = Array(numMessages)
    .fill(0)
    .map((_, i) => `Hello, world! ${i}`);
  for (let i = 0; i < numMessages; i++) {
    const user = i % keypairs.length;
    const dialect = await getDialectForMembers(
      program,
      members,
      keypairs[user],
    );
    console.log(`sending message ${i}...`);
    await sendMessage(program, dialect, keypairs[user], texts[i]);
  }
};

const index = async (): Promise<void> => {
  const numMembers = 2;
  const [program, keypairs, members] = await setup(numMembers);
  await createMetadatas(program, keypairs);
  const dialect = await createDialect(program, keypairs[0], members);
  await subscribeUsers(program, dialect, keypairs);
  await sendMessages(program, keypairs, members);
};

index();
