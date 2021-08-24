import Head from 'next/head';
import * as React from 'react';

export default function Landing(): JSX.Element {
  return (
    <>
      <Head>
        <title>dialect</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className='flex flex-col flex-grow'>
        <h1 className="mt-24 md:mt-64 text-8xl font-crimson dark:text-gray-200">dialect</h1>
        <p className="text-lg text-center">
          <div className='flex flex-grow justify-center'>
            <div>On-chain,&nbsp;</div>
            <div className='flex flex-col'>
              <span className='line-through'>encrypted</span>
              <span className='text-xs italic'>coming soon</span>
            </div>
            <div>&nbsp;Solana messaging protocol.</div>
          </div>
        </p>
      </div>
    </>
  );
}
