import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { createDialect, Member, programs, Wallet_, idl } from '..';

const NETWORK_NAME = 'localnet';

const local = new web3.Connection(programs[NETWORK_NAME].clusterAddress, 'recent');

const setup = async (n: number): Promise<[anchor.Program, web3.Keypair[]]> => {
  // create keypairs & wallet
  const keypairs = createKeypairs(n);
  const wallet = Wallet_.embedded(keypairs[0].secretKey);

  // configure anchor
  anchor.setProvider(new anchor.Provider(local, wallet, anchor.Provider.defaultOptions()));
  const program = new anchor.Program(idl as anchor.Idl, new anchor.web3.PublicKey(programs[NETWORK_NAME].programAddress));

  // fund keypairs
  await fundKeypairs(program, keypairs);

  return [program, keypairs];
};

const createKeypairs = (n: number): web3.Keypair[] => {
  return new Array(n).fill(0).map(_ => web3.Keypair.generate());
};

const fundKeypairs = async (program: anchor.Program, keypairs: web3.Keypair[], amount: number | undefined = 10 * web3.LAMPORTS_PER_SOL): Promise<void> => {
  await Promise.all(keypairs.map(async (keypair) => {
    const fromAirdropSignature = await program.provider.connection.requestAirdrop(
      keypair.publicKey,
      amount,
    );
    await program.provider.connection.confirmTransaction(fromAirdropSignature);
  }));
};

const index = async (): Promise<void> => {
  const [program, keypairs] = await setup(2);
  const members = keypairs.map((kp: web3.Keypair) => ({
    publicKey: kp.publicKey,
    scopes: [true, true],
  } as Member));
  const dialect = await createDialect(program, keypairs[0], members);
  console.log('dialect', dialect);
};

(index)();
