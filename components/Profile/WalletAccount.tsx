import React from 'react';
import useApi from '../../utils/ApiContext';
import {ownerFetcher} from '../../api';
import useWallet from '../../utils/WalletContext';
import useSWR from 'swr';

type WalletComponentType = {
  publicKey: string | undefined;
  balance: number | undefined;
}

export function WalletComponent({publicKey, balance}: WalletComponentType): JSX.Element {
  return (
    <div className='overflow-hidden'>
      <p className='text-xs dark:text-gray-400'>Public key</p>
      <code className='overflow-ellipsis text-sm text-gray-900 dark:text-gray-200'>{publicKey || '–'}</code>
      <div className='h-2'></div>
      <p className='text-xs dark:text-gray-400'>Balance</p>
      <div className='text-sm text-gray-900 dark:text-gray-200'>⊙ {balance || '–'}</div>
    </div>
  );
}

export default function WalletAccount(): JSX.Element {
  const { connection } = useApi();
  const { wallet } = useWallet();
  const {data} = useSWR(connection && wallet ? ['/owner', wallet, connection] : null, ownerFetcher);

  const balance: number | undefined = data?.lamports ? data.lamports / 1e9 : undefined;

  return (
    <WalletComponent publicKey={wallet?.publicKey.toString()} balance={balance} />
  );
}
