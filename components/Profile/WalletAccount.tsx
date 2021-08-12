import React, {useEffect, useState} from 'react';
import { getPublicKey } from '../../utils';
import * as anchor from '@project-serum/anchor';
import useApi, { ownerFetcher } from '../../utils/ApiContext';
import useWallet, { Wallet_ } from '../../utils/WalletContext';
import useSWR from 'swr';

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
  const { connection } = useApi();
  const { wallet } = useWallet();
  const {data} = useSWR(connection && wallet ? ['/owner', wallet, connection] : null, ownerFetcher);

  const balance: number | null = data?.lamports ? data.lamports / 1e9 : null;

  const pubkey = getPublicKey(wallet);
  return (
    <WalletComponent account={pubkey} balance={balance} />
  );
}
