import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import * as React from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import useDarkMode, { DarkModeContextProvider } from '../utils/DarkModeContext';
import { WalletContextProvider } from '../utils/WalletContext';

function AppWithContext(props: AppProps): JSX.Element {
  return (
    <DarkModeContextProvider>
      <WalletContextProvider>
        <App {...props} />
      </WalletContextProvider>
    </DarkModeContextProvider>
  );
}

function App({ Component, pageProps }: AppProps): JSX.Element {
  const { darkMode } = useDarkMode();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col min-h-screen py-2 dark:bg-black">
        <Navbar />
        <main className="flex flex-col max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8 space-y-4">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
export default AppWithContext;
