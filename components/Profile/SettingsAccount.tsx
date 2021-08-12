import React, { useEffect } from 'react';
import useWallet from '../../utils/WalletContext';
import useApi, { profileFetcher } from '../../utils/ApiContext';
import useSWR from 'swr';
import { getPublicKey } from '../../utils';
import { WalletComponent } from './WalletAccount';

export default function ProfileAccount(): JSX.Element {
  const {wallet} = useWallet();
  const {program} = useApi();
  const { data, error } = useSWR(wallet && program ? ['profile', wallet, program] : null, profileFetcher);
  return (
    <WalletComponent account={null} balance={null} />
  );
}
