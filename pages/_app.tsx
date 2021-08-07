import 'tailwindcss/tailwind.css';
import type { AppProps } from 'next/app';
import * as React from 'react';

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return <Component {...pageProps} />;
}
export default MyApp;
