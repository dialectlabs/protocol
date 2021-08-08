import Head from 'next/head';
import * as React from 'react';
import Navbar from '../components/Navbar';

export default function Home(): JSX.Element {
  const [darkMode, setDarkMode] = React.useState(false);
  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      />
      <div className="flex flex-col items-center justify-center min-h-screen py-2 dark:bg-black">
        <Head>
          <title>dialect</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center space-y-4">
          <h1 className="text-8xl font-crimson dark:text-gray-200">
            dialect
          </h1>
          <p className="text-lg text-gray-500">
            On-chain, encrypted Solana messaging protocol.
          </p>
        </main>

        <footer className="text-gray-600 flex items-center justify-center w-full h-24 border-t dark:border-gray-900">
          &copy; 2021 Helios Labs
        </footer>
      </div>
    </div>
  );
}
