import React from 'react';
import useWallet from '../../utils/WalletContext';
import useApi, { settingsFetcher } from '../../utils/ApiContext';
import useSWR from 'swr';
import { WalletComponent } from './WalletAccount';

export default function SettingsAccount(): JSX.Element {
  const {wallet} = useWallet();
  const {program, connection} = useApi();
  const { data } = useSWR(
    wallet && program && connection
    ? ['/settings', wallet, program, connection] 
    : null,
    settingsFetcher);
  return (
    <WalletComponent account={data?.account?.publicKey} balance={data?.account?.lamports / 1e9} />
  );
}
