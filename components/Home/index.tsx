import React from 'react';
import useSWR from 'swr';
import Page from '../Page';
import Messages from '../Messages';
import useWallet from '../../utils/WalletContext';
import useApi from '../../utils/ApiContext';
import { getSettings } from '../../api';
import {useRouter} from 'next/router';

export default function Home(): JSX.Element {
  const router = useRouter();
  const { wallet } = useWallet();
  const { program, connection } = useApi();
  const { data, error } = useSWR(wallet && program && connection ? ['/settings', program, connection, wallet.publicKey] : null, getSettings);
  const loading = !data && !error;
  if (error) {
    router.push('/profile');
  }
  if (loading) {
    return <div />;
  }
  return (
    <Page>
      <Messages />
    </Page>
  );
}
