import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import useApi from '../../utils/ApiContext';
import { useRouter } from 'next/router';
import useWallet from '../../utils/WalletContext';
import MessagePreview from './MessagePreview';
import * as anchor from '@project-serum/anchor';
import { settingsFetch, ThreadAccount, threadFetch, threadsFetch } from '../../api';

export default function MessagesList(): JSX.Element {
  const router = useRouter();
  const {threadId} = router.query;
  const { wallet } = useWallet();
  const { connection, program } = useApi();
  const [publicKeys, setPublicKeys] = useState<string[]>([]);
  const { data } = useSWR(
    wallet?.publicKey && connection && program ? [
      'settings',
      program,
      connection,
      wallet?.publicKey.toString(),
    ] : null,
    settingsFetch,
    {
      refreshInterval: 500
    },
  );
  useEffect(() => {
    if (data) {
      setPublicKeys(data.settings.threads.map(thread => thread.key.toString()));
    }
  }, [data]);
  const { data: threads } = useSWR(data && data?.settings?.threads.length > 0 ? ['/threads', program, publicKeys] : null, threadsFetch, {
    refreshInterval: 500,
  });
  return (
    <div className='flex flex-col flex-grow overflow-y-auto'>
      {threads && threads.filter((thread) => thread !== undefined).map((thread, idx) => (
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
