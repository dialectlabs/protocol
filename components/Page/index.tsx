import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import useWallet from '../../utils/WalletContext';

type PropsType = {
  title?: string;
  children: JSX.Element;
};

export function ProtectedPage(props: PropsType): JSX.Element {
  const router = useRouter();
  const { wallet } = useWallet();
  useEffect(() => {
    if (!router) return;
    
    if (!wallet?.connected) {
      router.push('/');
    }
  }, [router, wallet]);
  if (!router || !wallet?.publicKey) {
    return <div />;
  }
  return <Page {...props} />;
}

export default function Page({ title, children }: PropsType): JSX.Element {
  return (
    <>
      <Head>
        <title>dialect | {title || 'Home'}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content={'dialect'} key="ogtitle" />
        <meta
          property="og:description"
          content={'On-chain Solana messaging protocol.'}
          key="ogdesc"
        />
        <meta property="og:url" content={'dialect.to'} key="ogurl" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:image" content={'https://dialect-public.s3.us-west-2.amazonaws.com/dialect.png'} />
      </Head>
      {title && (
        <div className="mt-6 md:mt-6 text-center">
          <h2>{title}</h2>
        </div>
      )}
      {children}
    </>
  );
}
