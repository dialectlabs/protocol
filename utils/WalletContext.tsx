import { Cluster, clusterApiUrl } from '@solana/web3.js';
import Wallet from '@project-serum/sol-wallet-adapter';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ProviderPropsType as PropsType } from './';

type ValueType = {
  wallet: Wallet | null | undefined;
  networkName: Cluster | 'localnet';
  setNetworkName: (networkName: Cluster | 'localnet') => void;
  onConnect: () => void;
  onDisconnect: () => void;
};
export const WalletContext = createContext<ValueType | null>({
  wallet: null,
  networkName: 'localnet',
  setNetworkName: (_networkName: Cluster | 'localnet') => undefined,
  onConnect: () => undefined,
  onDisconnect: () => undefined,
});

export const WalletContextProvider = (props: PropsType): JSX.Element => {
  const [selectedWallet, setSelectedWallet] = useState<
    Wallet | undefined | null
  >(undefined);
  const [, setUrlWallet] = useState<Wallet | null>(null);
  const [networkName, setNetworkName] = useState<Cluster | 'localnet'>(
    'localnet'
  );
  const network: string = useMemo(() => {
    if (networkName === 'localnet') {
      return 'http://127.0.0.1:8899';
    }
    return clusterApiUrl(networkName);
  }, [networkName]);
  const [providerUrl] = useState<string>('https://www.sollet.io');
  // const connection = useMemo(() => new Connection(network), [network]);
  useEffect(() => {
    const w = new Wallet(providerUrl, network);
    console.log('providerUrl', providerUrl);
    console.log('network', network);
    console.log('wallet', w);
    setUrlWallet(w);
  }, [providerUrl, network]);

  const [, setConnected] = useState(false);
  useEffect(() => {
    if (selectedWallet) {
      selectedWallet.on('connect', () => {
        setConnected(true);
        console.log(
          `Connected to wallet ${selectedWallet.publicKey?.toBase58() ?? '--'}`
        );
      });
      selectedWallet.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from wallet');
      });
      void selectedWallet.connect();
      return () => {
        void selectedWallet.disconnect();
      };
    }
  }, [selectedWallet]);
  return (
    <WalletContext.Provider
      value={{
        wallet: selectedWallet,
        networkName,
        setNetworkName,
        onConnect: () => setSelectedWallet(null),
        onDisconnect: () => setSelectedWallet(null),
      }}
    >
      {props.children}
    </WalletContext.Provider>
  );
};

export default function useWallet(): ValueType {
  return useContext(WalletContext) as ValueType;
}
