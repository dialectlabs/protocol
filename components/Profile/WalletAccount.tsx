import React, { useEffect, useState } from 'react';
import {CheckIcon, ClipboardCopyIcon} from '@heroicons/react/outline';
import useApi from '../../utils/ApiContext';
import {ownerFetcher} from '../../api';
import useWallet from '../../utils/WalletContext';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';

type WalletComponentType = {
  publicKey?: string | undefined;
  balance?: number | undefined;
  copyable?: boolean;
}

export function WalletComponent({copyable, publicKey, balance}: WalletComponentType): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  } , [copied]);
  const handleCopy = () => {
    if (typeof publicKey === 'string') {
      copy(publicKey || '');
      setCopied(true);
    }
  };
  return (
    <div className='overflow-hidden'>
      <p className='text-xs dark:text-gray-400'>Public key</p>
      {copyable ? (

        <button
        className='text-lg flex items-center space-x-2 dark:text-gray-400'
        onClick={handleCopy}
        >
          <p className='dark:text-gray-300'>{publicKey}</p>
          {copied ? (
            <CheckIcon className='w-5 h-5 text-green-500' />
          ) : (
            <ClipboardCopyIcon className='w-5 h-5' />
          )}
        </button>
      ) : (
        <code className='overflow-ellipsis text-sm text-gray-900 dark:text-gray-200'>{publicKey || '–'}</code>
      )}
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
    <WalletComponent publicKey={wallet?.publicKey.toString()} balance={balance} copyable />
  );
}
