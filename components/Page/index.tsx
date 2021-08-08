import Head from 'next/head';
import React from 'react';

type PropsType = {
  title: string;
  children: JSX.Element;
};

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
