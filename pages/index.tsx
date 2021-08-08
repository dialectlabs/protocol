import React from 'react';
import Navbar from '../components/Navbar';
import Landing from '../components/Landing';
import useDarkMode, { DarkModeContextProvider } from '../utils/DarkModeContext';

export default function HomeContextWrapper(props: JSX.Element): JSX.Element {
  return (
    <DarkModeContextProvider>
      <Home {...props} />
    </DarkModeContextProvider>
  );
}

function Home(): JSX.Element {
  const { darkMode } = useDarkMode();
  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navbar />
      <Landing />
    </div>
  );
}
