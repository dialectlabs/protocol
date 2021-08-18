import React from 'react';
import useSWR from 'swr';
import useApi from '../../utils/ApiContext';
import { useRouter } from 'next/router';
import useWallet from '../../utils/WalletContext';
import MessagePreview from './MessagePreview';
import { settingsFetch, ThreadAccount, threadFetch } from '../../api';

export default function MessagesList(): JSX.Element {
  const router = useRouter();
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
  );
  console.log('data.settings', data?.settings);
  const { data: thread } = useSWR(data ? ['/m/', program, data.settings.threads[0].key] : null, threadFetch, {
    onSuccess: () => {
      console.log('success');
    },
    onError: (error) => {
      console.log('error', error);
    },
  });
  console.log('settings', data);
  console.log('thread', thread);
  const threads = [thread, thread];
  return (
    <div className='flex flex-col space-y-2'>
      {threads.filter((thread) => thread !== undefined).map((thread, idx) => (
        <div
          key={idx}
          className='h-20 border-b border-gray-200 dark:border-gray-800 hover:cursor-pointer'
          onClick={() => router.push(`/m/${thread?.publicKey.toString()}`)}
        >
          <MessagePreview thread={thread as ThreadAccount} />
        </div>
      ))}
    </div>
  );
}
