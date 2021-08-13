import { Cluster, clusterApiUrl } from '@solana/web3.js';
import Wallet from '@project-serum/sol-wallet-adapter';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Wallet_, ProviderPropsType as PropsType } from './';

type ValueType = {
  wallet: Wallet_ | null | undefined;
  networkName: Cluster | 'localnet';
  setNetworkName: (networkName: Cluster | 'localnet') => void;
  onConnect: () => void;
  onDisconnect: () => void;
};
export const WalletContext = createContext<ValueType | null>({
  wallet: null,
  networkName: 'localnet',
  setNetworkName: (_: Cluster | 'localnet') => {
    _;
  },
  onConnect: () => undefined,
  onDisconnect: () => undefined,
});

export const WalletContextProvider = (props: PropsType): JSX.Element => {
  const [selectedWallet, setSelectedWallet] = useState<
    Wallet_ | undefined | null
  >(undefined);
  const [urlWallet, setUrlWallet] = useState<Wallet | null>(null);
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
    setUrlWallet(w);
  }, [providerUrl, network]);

  const [, setConnected] = useState(false);
  useEffect(() => {
    if (selectedWallet) {
      selectedWallet.on('connect', () => {
        setConnected(true);
      });
      selectedWallet.on('disconnect', () => {
        setConnected(false);
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
        onConnect: () => setSelectedWallet(urlWallet),
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
