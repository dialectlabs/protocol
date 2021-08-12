import React from 'react';
import useWallet from '../../utils/WalletContext';
import { getPublicKey } from '../../utils';
import { WalletComponent } from './WalletAccount';

export default function ProfileAccount(): JSX.Element {
  const { wallet } = useWallet();
  const pubkey = getPublicKey(wallet);
  return (
    <WalletComponent account={pubkey} balance={null} />
  );
}
