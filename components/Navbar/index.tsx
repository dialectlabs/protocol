/* This example requires Tailwind CSS v2.0+ */
import { Cluster } from '@solana/web3.js';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import Wallet from '@project-serum/sol-wallet-adapter';
import { BeakerIcon, CubeIcon, MoonIcon, LightningBoltIcon, SunIcon, XIcon } from '@heroicons/react/outline';
import { PlusIcon } from '@heroicons/react/solid';
import * as React from 'react';
import { DarkModeContext, ValueType as DarkModeType } from '../../utils/DarkModeContext';

const walletNavigation = [
  { name: 'mainnet (coming soon)', href: '#', disabled: true, networkName: 'mainnet-beta' },
  { name: 'testnet (coming soon)', href: '#', disabled: true, networkName: 'testnet' },
  { name: 'localnet', href: '#', disabled: false, networkName: 'localnet' },
];

function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
}

type PropType = {
  networkName: Cluster | 'localnet',
  wallet: Wallet | null,
  onWalletConnect: () => void,
  onWalletDisconnect: () => void,
  setNetworkName: (networkName: Cluster | 'localnet') => void,
};

export default function Navbar({networkName, setNetworkName, wallet, onWalletConnect, onWalletDisconnect}: PropType): JSX.Element {
  const {darkMode, setDarkMode} = React.useContext(DarkModeContext) as DarkModeType;
  if (wallet && wallet.connected) {
    const pubkeystr = `${wallet.publicKey?.toBase58()}`;
    console.log('pubkey', pubkeystr);
    console.log('pubkeystr begin', pubkeystr.slice(0, 4));
    console.log('pubkeystr end', pubkeystr.slice(pubkeystr.length - 4));
  }
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
              <Menu as="div" className="relative">
                {({ open }) => (
                  <>
                    <div>
                      <Menu.Button className="relative inline-flex items-center px-4 py-2 border-transparent shadow-sm text-sm font-medium rounded-md rounded-l-none text-white bg-red-700 dark:bg-red-600 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-800 focus:ring-red-700 dark:text-gray-300">
                        <span className="sr-only">Open wallet menu</span>
                        {networkName === 'localnet' ? (
                          <BeakerIcon className='w-5 h-5'/>
                        ) : networkName === 'testnet' ? (
                          <CubeIcon className='w-5 h-5' />
                        ) : (
                          <LightningBoltIcon className='w-5 h-5'/>
                        )}
                      </Menu.Button>
                    </div>
                    <Transition
                      show={open}
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items
                        static
                        className="flex flex-col dark:bg-gray-900 dark:border-2 dark:border-gray-700 origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        {walletNavigation.map((item) => (
                          <Menu.Item key={item.name}>
                            {({ active }) => (
                              <button
                                disabled={item.disabled}
                                onClick={() => setNetworkName(item.networkName as Cluster | 'localnet')}
                                className={classNames(
                                  active && !item.disabled ? 'bg-gray-100 dark:bg-gray-800' : 'cursor-default',
                                  `flex flex-grow space-x-2 items-center block px-4 py-2 text-sm ${!item.disabled ? 'text-gray-800' : 'text-gray-400'} ${!item.disabled ? 'dark:text-gray-300' : 'dark:text-gray-500'} dark:bg-gray-900`
                                )}
                              >
                                {item.networkName === 'localnet' ? (
                                  <BeakerIcon className='w-4 h-4'/>
                                ) : item.networkName === 'testnet' ? (
                                  <CubeIcon className='w-4 h-4' />
                                ) : 
                                (
                                  <LightningBoltIcon className='w-4 h-4'/>
                                )}
                                <span>{item.name}</span>
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Transition>
                  </>
                )}
              </Menu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
