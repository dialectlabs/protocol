import React, {useEffect, useState} from 'react';
import useWallet from '../../utils/WalletContext';
import { getPublicKey } from '../../utils';
import * as anchor from '@project-serum/anchor';
import { Connection } from '@solana/web3.js';

// anchor.setProvider(anchor.Provider.local());
// const PROGRAM = anchor.workspace.Dialect;

const idl = {
  'version': '0.0.0',
  'name': 'dialect',
  'instructions': [
    {
      'name': 'createUserThreadsAccount',
      'accounts': [
        {
          'name': 'owner',
          'isMut': false,
          'isSigner': true
        },
        {
          'name': 'threadsAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'rent',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'systemProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'nonce',
          'type': 'u8'
        }
      ]
    }
  ],
  'accounts': [
    {
      'name': 'ThreadsAccount',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'owner',
            'type': 'publicKey'
          },
          {
            'name': 'threads',
            'type': {
              'vec': {
                'defined': 'Thread'
              }
            }
          }
        ]
      }
    }
  ],
  'types': [
    {
      'name': 'Thread',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'key',
            'type': 'publicKey'
          }
        ]
      }
    }
  ],
  'metadata': {
    'address': '7oitXQbFhgc6zrJoXpA3bhz86oWxBfVfCsfFgRDKkRCz'
  }
};

async function _findThreadsProgramAddress(
  program: anchor.Program, publicKey: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      publicKey.toBuffer(),
      Buffer.from('threads_account'),
    ],
    program.programId,
  );
}

type WalletComponentType = {
  account: string | null;
  balance: number | null;
}

export function WalletComponent({account, balance}: WalletComponentType): JSX.Element {
  return (
    <div>
      <p className='text-xs dark:text-gray-400'>Public key</p>
      <code className='text-sm text-gray-900 dark:text-gray-200'>{account || '–'}</code>
      <div className='h-2'></div>
      <p className='text-xs dark:text-gray-400'>Balance</p>
      <div className='text-sm text-gray-900 dark:text-gray-200'>⊙ {balance || '–'}</div>
    </div>
  );
}

export default function WalletAccount(): JSX.Element {
  const connection = new Connection(
    'http://localhost:8899',
    'recent',
  );
  const [balance, setBalance] = useState(null);
  const [provider, setProvider]: [anchor.Provider | null, React.Dispatch<React.SetStateAction<anchor.Provider | null>>] = useState(null as anchor.Provider | null);
  const { wallet } = useWallet();

  const pubkey = getPublicKey(wallet);
  useEffect(() => {
    if (wallet) {

      setProvider(new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions()));
    }
  }, [wallet]);
  useEffect(() => {
    (async () => {
      if (provider && wallet?.publicKey) {
        anchor.setProvider(provider);
        // const idlMap = new Map<string, anchor.Idl>();
        const program = new anchor.Program(idl as anchor.Idl, new anchor.web3.PublicKey(idl.metadata.address));
        const owner = await connection.getAccountInfo(wallet.publicKey);
        setBalance(owner?.lamports ? owner.lamports / 1e9 : null);
        const [_threadspk, _nonce] = await _findThreadsProgramAddress(program, wallet.publicKey);
        try {
          const threadsAccount = await program.account.threadsAccount.fetch(_threadspk);
        } catch (e) { console.log('e', e); }
      }
    })();
  }, [provider]);
  if (!pubkey || balance === null) {
    return <div>Loading...</div>;
  }
  return (
    <WalletComponent account={pubkey} balance={balance} />
  );
}
