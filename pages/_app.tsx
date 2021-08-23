import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import * as React from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { WalletContextProvider } from '../utils/WalletContext';
import { ApiContextProvider } from '../utils/ApiContext';
import {ThemeProvider} from 'next-themes';

function AppWithContext(props: AppProps): JSX.Element {
  return (
    <ThemeProvider attribute='class'>
      <WalletContextProvider>
        <ApiContextProvider>
          <App {...props} />
        </ApiContextProvider>
      </WalletContextProvider>
    </ThemeProvider>
  );
}

function App({ Component, pageProps }: AppProps): JSX.Element {

  return (
    <div className='min-h-screen'>
      <div className="flex flex-col h-screen py-0 dark:bg-black">
        <main className="flex flex-col max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8 h-screen">
          <Navbar />
          <Component {...pageProps} />
          <Footer />
        </main>
      </div>
    </div>
  );
}
export default AppWithContext;
