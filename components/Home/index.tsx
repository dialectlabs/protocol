import React from 'react';
import Page from '../Page';
import Messages from '../Messages';

export default function Home(): JSX.Element {
  return (
    <Page>
      {/* <p className="text-gray-500 dark:text-gray-400">
        Read unread messages, send new messages, etc.
      </p> */}
      <Messages />
    </Page>
  );
}
