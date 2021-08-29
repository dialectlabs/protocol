import Head from 'next/head';
import {CheckIcon, ClipboardCopyIcon} from '@heroicons/react/outline';
import React, {useEffect, useState} from 'react';
import copy from 'copy-to-clipboard';

export default function Landing(): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const publicKey = 'D14LECT8t6ya4s9zk6Xk1w79rSBtCQXhqN9J5j4RGoY9';
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  } , [copied]);
  const handleCopy = () => {
    if (typeof publicKey === 'string') {
      copy(publicKey || '');
      setCopied(true);
    }
  };
  return (
    <>
      <Head>
        <title>dialect</title>
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
      <div className='flex flex-col flex-grow'>
        <h1 className="mt-24 md:mt-64 text-8xl font-crimson dark:text-gray-200">dialect</h1>
        <p className="mb-12 sm:mb-24 text-lg text-center">
          <div className='flex flex-grow justify-center'>
            <div>On-chain Solana messaging protocol. Encryption coming soon.</div>
          </div>
        </p>
        <p className="text-lg text-center">
          <div className='flex flex-col flex-grow items-center space-y-2'>
            <div>Drop us a line.</div>
            <button
              className='text-sm flex items-center space-x-1 text-gray-600 dark:text-gray-400 px-3 py-1 border rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-900'
              onClick={handleCopy}
            >
              <code className='text-black dark:text-gray-300'>{publicKey}</code>
              {copied ? (
                <div><CheckIcon className='w-4 h-4 text-green-500' /></div>
              ) : (
                <div><ClipboardCopyIcon className='w-4 h-4' /></div>
              )}
            </button>
          </div>
        </p>
      </div>
    </>
  );
}
