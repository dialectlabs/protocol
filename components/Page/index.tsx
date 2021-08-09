import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import useWallet from '../../utils/WalletContext';

type PropsType = {
  title: string;
  children: JSX.Element;
};

export function ProtectedPage(props: PropsType): JSX.Element {
  const router = useRouter();
  const { wallet } = useWallet();
  useEffect(() => {
    if (!wallet?.connected) {
      router.push('/');
    }
  }, []);
  if (!router) {
    return <div />;
  }
  return <Page {...props} />;
}

export default function Page({ title, children }: PropsType): JSX.Element {
  return (
    <>
      <Head>
        <title>dialect | {title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="mt-24 md:mt-24">
        <h1 className="text-6xl font-crimson dark:text-gray-200">{title}</h1>
        {children}
      </div>
    </>
  );
}
