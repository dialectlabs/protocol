import React from 'react';
import Page from '../Page';

export default function Home(): JSX.Element {
  return (
    <Page title={'Messages'}>
      <p className="text-gray-500 dark:text-gray-400">Read unread messages, send new messages, etc.</p>
    </Page>
  );
}