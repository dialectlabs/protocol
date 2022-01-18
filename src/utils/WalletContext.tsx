import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor/src/provider';
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
  webWallet: Wallet | null | undefined;
  networkName: Cluster | 'localnet';
  setNetworkName: (networkName: Cluster | 'localnet') => void;
  onConnect: (_: Uint8Array | null) => void;
  onWebConnect: (_: Wallet) => void;
  onDisconnect: () => void;
  onWebDisconnect: () => void;
};
export const WalletContext = createContext<ValueType | null>({
  wallet: null,
  webWallet: null,
  networkName: (process?.env?.ENVIRONMENT as Cluster | 'localnet') || 'localnet',
  setNetworkName: (_: Cluster | 'localnet') => {
    _;
  },
  onConnect: (_: Uint8Array | null) => {
    _;
  },
  onWebConnect: (_: Wallet) => {
    _;
  },
  onDisconnect: () => undefined,
  onWebDisconnect: () => undefined,
});

export const WalletContextProvider = (props: PropsType): JSX.Element => {
  const [selectedWallet, setSelectedWallet] = useState<Wallet_ | null>(null);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [webWallet, setWebWallet] = useState<Wallet | null>(null);
  const [networkName, setNetworkName] = useState<Cluster | 'localnet'>(
    (process?.env?.NEXT_PUBLIC_SOLANA_ENVIRONMENT as Cluster) || 'localnet',
  );
  // const network: string = useMemo(() => {
  //   if (networkName === 'localnet') {
  //     return 'http://127.0.0.1:8899';
  //   }
  //   return clusterApiUrl(networkName);
  // }, [networkName]);
  // FS: this code uses some of the variables above and seems like provides a connection to blockchain, needs to be looked at, before removal
  // const [providerUrl] = useState<string>('https://www.sollet.io');
  // // const connection = useMemo(() => new Connection(network), [network]);
  // useEffect(() => {
  //   const w = new Wallet(providerUrl, network);
  //   setUrlWallet(w);
  // }, [providerUrl, network]);

  useEffect(() => {
    if (privateKey) {
      console.log('setting private key...');
      setSelectedWallet(Wallet_.embedded(privateKey));
    } else {
      console.log('UNsetting private key...');
      setSelectedWallet(null);
    }
  }, [privateKey]);

  const value = {
    wallet: selectedWallet,
    webWallet,
    networkName,
    setNetworkName,
    onConnect: (privateKey: Uint8Array | null) => {
      console.log('onConnect in protocol', privateKey);
      setPrivateKey(privateKey);
    },
    onWebConnect: (wallet: Wallet) => {
      console.log('onWebConnect in protocol', wallet);
      setWebWallet(wallet);
    },
    onDisconnect: () => setPrivateKey(null),
    onWebDisconnect: () => setWebWallet(null),
  };

  return (
    <WalletContext.Provider value={value}>
      {props.children}
    </WalletContext.Provider>
  );
};

export function useWallet(): ValueType {
  const context = useContext(WalletContext) as ValueType;
  if (context === undefined) {
    throw new Error('useCount must be used within a WalletContextProvider');
  }
  return context;
}

export default useWallet;
