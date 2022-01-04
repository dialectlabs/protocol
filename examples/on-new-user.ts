import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import {
  createDialect,
  createMetadata,
  getDialectForMembers,
  idl,
  Member,
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

export type SetupResult = {
  program: anchor.Program;
  dialectKeyPair: web3.Keypair;
  userKeyPair: web3.Keypair;
};

const setup = async (): Promise<SetupResult> => {
  let dialectPrivateKey;
  if (process.env.DIALECT_PRIVATE_KEY) {
    console.log(
      'DIALECT_PRIVATE_KEY is set using env var, will use this private key',
    );
    dialectPrivateKey = new Uint8Array(
      JSON.parse(process.env.DIALECT_PRIVATE_KEY as string),
    );
  } else {
    dialectPrivateKey = web3.Keypair.generate().secretKey;
  }
  const dialectKeyPair = web3.Keypair.fromSecretKey(dialectPrivateKey);
  const userKeyPair = web3.Keypair.generate();

  const wallet = Wallet_.embedded(dialectPrivateKey);

  // configure anchor
  anchor.setProvider(
    new anchor.Provider(local, wallet, anchor.Provider.defaultOptions()),
  );
  const program = new anchor.Program(
    idl as anchor.Idl,
    new anchor.web3.PublicKey(programs[NETWORK_NAME].programAddress),
  );

  // fund keypairs
  const keypairs = [dialectKeyPair, userKeyPair];
  await fundKeypairs(program, keypairs);
  return {
    program,
    dialectKeyPair,
    userKeyPair,
  };
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

const index = async (): Promise<void> => {
  const { program, dialectKeyPair, userKeyPair } = await setup();

  program.addEventListener('CreateMetadataEvent', async (event, slot) => {
    console.log('CreateMetadataEvent', event, slot);
    const user = event.user as anchor.web3.PublicKey;
    const members: Member[] = [
      {
        publicKey: dialectKeyPair.publicKey,
        scopes: [true, true],
      },
      {
        publicKey: user,
        scopes: [false, false],
      },
    ];
    let dialect = await createDialect(program, dialectKeyPair, members);
    await subscribeUser(
      program,
      dialect,
      userKeyPair.publicKey,
      dialectKeyPair,
    );
    await sendMessage(program, dialect, dialectKeyPair, 'Hello from dialect!');

    dialect = await getDialectForMembers(program, members, userKeyPair);
    console.log(dialect.dialect.messages);
  });

  await createMetadata(program, userKeyPair);
};

index();
