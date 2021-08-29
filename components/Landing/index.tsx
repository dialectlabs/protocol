import Head from 'next/head';
import {CheckIcon, ClipboardCopyIcon} from '@heroicons/react/outline';
import { PlayIcon } from '@heroicons/react/solid';
import React, {useEffect, useState} from 'react';
import copy from 'copy-to-clipboard';
import Button from '../Button';

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
        <meta property="og:image" content={''} />
      </Head>
      <div className='flex flex-col flex-grow'>
        <h1 className="mt-24 md:mt-48 text-8xl font-crimson dark:text-gray-200">dialect</h1>
        <p className="mb-8 sm:mb-14 text-lg text-center">
          <div className='flex justify-center'>
            <div>On-chain Solana messaging protocol. Encryption coming soon.</div>
          </div>
        </p>
        <div className='flex justify-center text-center'>
          <a rel="noreferrer" href='https://youtu.be/yaLHR1Ivr5g' target='_blank' className='mb-8 sm:mb-16 rounded-md px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-900'>
            <div className='flex justify-center'>
              <div className='mb-2 p-2 rounded-full bg-gray-200 dark:bg-gray-900'>
                <PlayIcon className='m-auto text-gray-600 dark:text-gray-200 w-12 h-12' />
              </div>
            </div>
            <div className='text-lg text-gray-600 dark:text-gray-400'>Watch a demo</div>
          </a>
        </div>
        
        <p className="text-lg text-center">
          <div className='flex flex-col items-center space-y-2'>
            <div className='text-lg'>Drop us a line</div>
            <button
              className='text-sm flex items-center space-x-1 text-gray-600 dark:text-gray-400 px-3 py-1 border rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 break-all'
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
