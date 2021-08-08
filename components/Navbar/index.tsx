import { Cluster } from '@solana/web3.js';
import Menu from '../../components/Menu';
import { BeakerIcon, CubeIcon, MoonIcon, LightningBoltIcon, SunIcon, XIcon } from '@heroicons/react/outline';
import { PlusIcon } from '@heroicons/react/solid';
import * as React from 'react';
import useDarkMode from '../../utils/DarkModeContext';
import useWallet from '../../utils/WalletContext';

const walletNavigation = [
  { name: 'mainnet (coming soon)', disabled: true, networkName: 'mainnet-beta' },
  { name: 'testnet (coming soon)', disabled: true, networkName: 'testnet' },
  { name: 'localnet', disabled: false, networkName: 'localnet' },
];

export default function Navbar(): JSX.Element {
  const {
    wallet,
    networkName,
    setNetworkName,
    onConnect: onWalletConnect,
    onDisconnect: onWalletDisconnect
  } = useWallet();
  const {darkMode, setDarkMode} = useDarkMode();
  const pubkeyStr = wallet && wallet.connected ? `${wallet.publicKey?.toBase58()}` : null;
  const displayPubkey = pubkeyStr ? `${pubkeyStr.slice(0, 4)}...${pubkeyStr.slice(pubkeyStr.length - 4)}` : null;
  return (
    <div className='dark:bg-black'>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="hidden sm:flex flex-shrink-0 flex items-center">
              <p className='text-3xl font-crimson dark:text-gray-400'>dialect</p>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex">
              <button
                type="button"
                className="border-none bg-none"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <SunIcon className="text-white mr-4 h-5 w-5" aria-hidden="true" /> : (<MoonIcon className="mr-4 h-5 w-5" aria-hidden="true" />)}
              </button>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                className="border-r-2 border-white dark:border-black relative inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md rounded-r-none text-white bg-red-700 dark:bg-red-600 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-700 dark:text-gray-300"
                onClick={wallet ? onWalletDisconnect : onWalletConnect}
              >
                {wallet && wallet.connected ? (
                  <>
                    <XIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    <span>{displayPubkey}</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    <span>Connect wallet</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex md:ml-0 md:flex-shrink-0 md:items-center">
              <Menu
                className='rounded-l-none'
                button={(
                  <>
                    <span className="sr-only">Open wallet menu</span>
                    {networkName === 'localnet' ? (
                      <BeakerIcon className='w-5 h-5'/>
                    ) : networkName === 'testnet' ? (
                      <CubeIcon className='w-5 h-5' />
                    ) : (
                      <LightningBoltIcon className='w-5 h-5'/>
                    )}
                  </>
                )}
                items={walletNavigation.map(item => ({
                  ...item,
                  onClick: () => setNetworkName(item.networkName as Cluster | 'localnet'),
                  itemChildren: (
                    <>
                      {item.networkName === 'localnet' ? (
                        <BeakerIcon className='w-4 h-4'/>
                      ) : item.networkName === 'testnet' ? (
                        <CubeIcon className='w-4 h-4' />
                      ) : (
                        <LightningBoltIcon className='w-4 h-4'/>
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
