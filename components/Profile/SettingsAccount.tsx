import React from 'react';
import useWallet from '../../utils/WalletContext';
import useApi from '../../utils/ApiContext';
import { settingsGet } from '../../api';
import useSWR from 'swr';
import { WalletComponent } from './WalletAccount';

export default function SettingsAccount(): JSX.Element {
  const {wallet} = useWallet();
  const {program, connection} = useApi();
  const { data } = useSWR(
    wallet && program && connection
    ? ['/settings', program, connection, wallet.publicKey] 
    : null,
    settingsGet);
  return (
    <WalletComponent account={data?.account?.publicKey} balance={data?.account?.lamports / 1e9} />
  );
}
