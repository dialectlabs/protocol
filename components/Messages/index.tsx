import React from 'react';
import MessagesListHeader from './MessagesListHeader';
import NoMessages from './NoMessages';
import NewMessage from './NewMessage';
import {useRouter} from 'next/router';

export default function Messages(): JSX.Element {
  const router = useRouter();
  const messageId = router.query.messageId;
  const isNew = router.pathname === '/m/new';
  return (
    <div className="card-gray w-full flex flex-1 rounded-md border dark:border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-400">
        <div className="w-1/3 border-r-2 dark:border-r dark:border-gray-600">
          <MessagesListHeader />
        </div>
      <div className="w-2/3 flex py-2 px-6">
        {isNew ? (
          <NewMessage />
        ) : !messageId ? (
          <NoMessages />
        ) : (
          <div>Message</div>
        )}
      </div>
    </div>
  );
}
