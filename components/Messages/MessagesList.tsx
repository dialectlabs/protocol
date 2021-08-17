import React from 'react';
import useSWR from 'swr';
import useApi from '../../utils/ApiContext';
import useWallet from '../../utils/WalletContext';
import { settingsFetch } from '../../api';

export default function MessagesList(): JSX.Element {
  const { wallet } = useWallet();
  const { connection, program } = useApi();
  const { data } = useSWR(
    wallet?.publicKey && connection && program ? [
      'threads',
      program,
      connection,
      wallet?.publicKey
    ] : null, settingsFetch);
  return (
    <div>
      <div>Messages - {data?.settings.threads.length || 0}</div>
    </div>
  );
}