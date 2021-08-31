import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { WalletContextProvider } from '../utils/WalletContext';
import { ApiContextProvider } from '../utils/ApiContext';
import useWallet from '../utils/WalletContext';
import { ThemeProvider } from 'next-themes';
import { ExclamationIcon } from '@heroicons/react/solid';

function AppWithContext(props: AppProps): JSX.Element {
  return (
    <ThemeProvider attribute='class' defaultTheme='dark'>
      <WalletContextProvider>
        <ApiContextProvider>
          <App {...props} />
        </ApiContextProvider>
      </WalletContextProvider>
    </ThemeProvider>
  );
}

function App({ Component, pageProps }: AppProps): JSX.Element {
  const { networkName } = useWallet();
  return (
    <div className='min-h-screen'>
      <div className="flex flex-col h-screen py-0 dark:bg-black">
        <main className="relative flex flex-col max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8 h-screen">
          {networkName === 'devnet' && (
            <div className='z-10 absolute top-0 left-1/2 transform -translate-x-1/2 flex justify-center'>
              <div className='flex items-center text-xs text-center text-white bg-red-700 dark:bg-red-600 px-2 py-1 rounded-b-md border border-white dark:border-black'>
                <ExclamationIcon className='w-4 h-4' />
                devnet issues, degraded functionality
              </div>
            </div>
          )}
          <Navbar />
          <Component {...pageProps} />
          <Footer />
        </main>
      </div>
    </div>
  );
}
export default AppWithContext;
