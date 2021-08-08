import React from 'react';

import Landing from '../components/Landing';
import Home from '../components/Home';
import useWallet from '../utils/WalletContext';

export default function Index(): JSX.Element {
  const {wallet} = useWallet();
  return (
    <>
      {wallet && wallet.connected ? (<Home />) : (<Landing />)}
    </>
  );
}
