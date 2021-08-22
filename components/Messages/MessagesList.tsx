import React from 'react';
import useSWR from 'swr';
import useApi from '../../utils/ApiContext';
import { useRouter } from 'next/router';
import useWallet from '../../utils/WalletContext';
import MessagePreview from './MessagePreview';
import * as anchor from '@project-serum/anchor';
import { settingsFetch, ThreadAccount, threadFetch } from '../../api';

export default function MessagesList(): JSX.Element {
  const router = useRouter();
  const {threadId} = router.query;
  const { wallet } = useWallet();
  const { connection, program } = useApi();
  const { data } = useSWR(
    wallet?.publicKey && connection && program ? [
      'threads',
      program,
      connection,
      wallet?.publicKey
    ] : null,
    settingsFetch,
    {
      refreshInterval: 500
    },
  );
  const { data: thread } = useSWR(data && data?.settings?.threads.length > 0 ? [`/m/${data.settings.threads[0].key.toString()}`, program, data.settings.threads[0].key] : null, threadFetch, {
    refreshInterval: 500,
  });
  const threads = [thread];
  return (
    <div className='flex flex-col space-y-2'>
      {threads.filter((thread) => thread !== undefined).map((thread, idx) => (
        <div
          key={idx}
          className={`flex flex-col justify-center px-3 py-2 h-20 border-b border-gray-200 dark:border-gray-800 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${thread && threadId === thread.publicKey.toString() && 'bg-gray-100 dark:bg-gray-800'}`}
          onClick={() => router.push(`/m/${thread?.publicKey.toString()}`)}
        >
          <MessagePreview thread={thread as ThreadAccount} />
        </div>
      ))}
    </div>
  );
}
