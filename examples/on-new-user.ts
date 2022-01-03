import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import {
  createDialect,
  createMetadata,
  getDialectForMembers,
  idl,
  Member,
  Metadata,
  programs,
  sendMessage,
  subscribeUser,
  Wallet_,
} from '..';

const NETWORK_NAME = 'localnet';
const local = new web3.Connection(
  programs['localnet'].clusterAddress,
  'recent',
);

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

const index = async (): Promise<void> => {
  const [program, keypairs] = await setup(1);
  const dialectServiceAccount = web3.Keypair.generate();
  const dialectMember: Member = {
    publicKey: dialectServiceAccount.publicKey,
    scopes: [true, true],
  };
  await fundKeypairs(program, [dialectServiceAccount]);

  program.addEventListener('CreateMetadataEvent', async (event, slot) => {
    console.log('CreateMetadataEvent', event, slot);
    const user = event.user as anchor.web3.PublicKey;
    const member: Member = {
      publicKey: user,
      scopes: [true, false],
    };
    const m2uMembers = [dialectMember, member];
    let dialect = await createDialect(
      program,
      dialectServiceAccount,
      m2uMembers,
    );

    await subscribeUser(
      program,
      dialect,
      member.publicKey,
      dialectServiceAccount,
    );
    await sendMessage(
      program,
      dialect,
      dialectServiceAccount,
      'Hello from dialect!',
    );

    dialect = await getDialectForMembers(program, m2uMembers, keypairs[0]);
    console.log(dialect.dialect.messages);
  });

  await createMetadatas(program, keypairs);
};

index();
