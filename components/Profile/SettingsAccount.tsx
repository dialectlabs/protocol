import React from 'react';
import useWallet from '../../utils/WalletContext';
import useApi from '../../utils/ApiContext';
import { settingsFetch } from '../../api';
import useSWR from 'swr';
import { WalletComponent } from './WalletAccount';

export default function SettingsAccount(): JSX.Element {
  const {wallet} = useWallet();
  const {program, connection} = useApi();
  const { data } = useSWR(
    wallet && program && connection
    ? ['/settings', program, connection, wallet.publicKey] 
    : null,
    settingsFetch);
  const balance = data && data.lamports !== null && data.lamports !== undefined ? data.lamports / 1e9 : undefined;
  return (
    <WalletComponent publicKey={data?.publicKey.toString()} balance={balance} />
  );
}
