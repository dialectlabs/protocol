import { Cluster } from '@solana/web3.js';
import Button from '../Button';
import Menu from '..//Menu';
import {
  BeakerIcon,
  ChatIcon,
  CubeIcon,
  CubeTransparentIcon,
  MoonIcon,
  LightningBoltIcon,
  SunIcon,
  UserCircleIcon,
  XIcon,
} from '@heroicons/react/outline';
import { PlusIcon } from '@heroicons/react/solid';
import * as React from 'react';
import useDarkMode from '../../utils/DarkModeContext';
import useWallet from '../../utils/WalletContext';
import { useRouter } from 'next/router';
import { getPublicKey } from '../../utils';

const networkNavigation = [
  {
    name: 'mainnet (coming soon)',
    disabled: true,
    networkName: 'mainnet-beta',
  },
  { name: 'devnet (coming soon)', disabled: true, networkName: 'devnet' },
  { name: 'testnet (coming soon)', disabled: true, networkName: 'testnet' },
  { name: 'localnet', disabled: false, networkName: 'localnet' },
];

const walletNavigation = [
  {
    name: 'Messages',
    disabled: false,
  },
  {
    name: 'Profile',
    disabled: false,
  },
  {
    name: 'Disconnect',
    disabled: false,
  },
];

export default function Navbar(): JSX.Element {
  const router = useRouter();
  const {
    wallet,
    networkName,
    setNetworkName,
    onConnect: onWalletConnect,
    onDisconnect: onWalletDisconnect,
  } = useWallet();
  const { darkMode, setDarkMode } = useDarkMode();
  const displayPubkey = getPublicKey(wallet, true);
  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* logo */}
          <div className="flex">
            <div className="hidden sm:flex flex-shrink-0 flex items-center">
              <button
                onClick={() => router.push('/')}
              >
                <h4>dialect</h4>
              </button>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4"></div>
          </div>
          {/* darkmode toggle */}
          <div className="flex items-center">
            <div className="flex">
              <button
                type="button"
                className="border-none bg-none"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? (
                  <SunIcon
                    className="icon mr-4 h-5 w-5"
                    aria-hidden="true"
                  />
                ) : (
                  <MoonIcon className="icon mr-4 h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {/* login */}
            <div className="flex-shrink-0">
              {wallet && wallet.connected ? (
                <Menu
                  className="border-r-2 rounded-r-none"
                  button={
                    <>
                      <span className="sr-only">Open wallet menu</span>
                      <UserCircleIcon
                        className="btn-txt -ml-1 mr-2 h-5 w-5"
                        aria-hidden="true"
                      />
                      <span className='btn-txt'>{displayPubkey}</span>
                    </>
                  }
                  items={walletNavigation.map((item) => ({
                    ...item,
                    onClick: () => {
                      if (item.name === 'Profile') {
                        router.push('/profile');
                      } else if (item.name === 'Messages') {
                        router.push('/');
                      } else if (item.name === 'Disconnect') {
                        onWalletDisconnect();
                      }
                    },
                    itemChildren: (
                      <>
                        {item.name === 'Profile' ? (
                          <UserCircleIcon className="w-4 h-4" />
                        ) : item.name === 'Disconnect' ? (
                          <XIcon className="w-4 h-4" />
                        ) : (
                          <ChatIcon className="w-4 h-4" />
                        )}
                        <span>{item.name}</span>
                      </>
                    ),
                  }))}
                />
              ) : (
                <Button
                  className="border-r-2 rounded-r-none"
                  onClick={onWalletConnect}
                >
                  <>
                    <PlusIcon
                      className="btn-txt -ml-1 mr-2 h-5 w-5"
                      aria-hidden="true"
                    />
                    <span className='btn-txt'>Connect wallet</span>
                  </>
                </Button>
              )}
            </div>
            {/* network */}
            <div className="flex md:ml-0 md:flex-shrink-0 md:items-center">
              <Menu
                className="rounded-l-none"
                button={
                  <>
                    <span className="sr-only">Open wallet menu</span>
                    {networkName === 'localnet' ? (
                      <BeakerIcon className="btn-txt w-5 h-5" />
                    ) : networkName === 'devnet' ? (
                      <CubeIcon className="btn-txt w-5 h-5" />
                    ) : networkName === 'testnet' ? (
                      <CubeTransparentIcon className="btn-txt w-5 h-5" />
                    ) : (
                      <LightningBoltIcon className="btn-txt w-5 h-5" />
                    )}
                  </>
                }
                items={networkNavigation.map((item) => ({
                  ...item,
                  onClick: () =>
                    setNetworkName(item.networkName as Cluster | 'localnet'),
                  itemChildren: (
                    <>
                      {item.networkName === 'localnet' ? (
                        <BeakerIcon className="w-4 h-4" />
                      ) : item.networkName === 'devnet' ? (
                        <CubeIcon className="w-5 h-5" />
                      ) : item.networkName === 'testnet' ? (
                        <CubeTransparentIcon className="w-5 h-5" />
                      ) : (
                        <LightningBoltIcon className="w-4 h-4" />
                      )}
                      <span>{item.name}</span>
                    </>
                  ),
                }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
