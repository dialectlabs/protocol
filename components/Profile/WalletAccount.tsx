import React from 'react';
import useWallet from '../../utils/WalletContext';
import { getPublicKey } from '../../utils';

type WalletComponentType = {
  account: string | null;
}

export function WalletComponent({account}: WalletComponentType): JSX.Element {
  return (
    <div>
      <p className='text-xs dark:text-gray-400'>Public key</p>
      <code className='text-sm text-gray-900 dark:text-gray-200'>{account || '–'}</code>
      <div className='h-2'></div>
      <p className='text-xs dark:text-gray-400'>Balance</p>
      <div className='text-sm text-gray-900 dark:text-gray-200'>⊙ {'0.000000'}</div>
    </div>
  );
}

export default function WalletAccount(): JSX.Element {
  const { wallet } = useWallet();
  const pubkey = getPublicKey(wallet);
  return (
    <WalletComponent account={pubkey} />
  );
}
