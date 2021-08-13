import React from 'react';
import MessagesListHeader from './MessagesListHeader';
import { PencilAltIcon } from '@heroicons/react/outline';

export default function Messages(): JSX.Element {
  return (
    <div className="card-gray w-full flex flex-1 rounded-md border dark:border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-400">
        <div className="w-1/3 border-r-2 dark:border-r dark:border-gray-600">
          <MessagesListHeader />
        </div>
      <div className="w-2/3 flex justify-center">
        <div className='flex justify-center items-center'>
          <button className='flex rounded-lg p-4 flex-col items-center bg-none hover:bg-gray-200 dark:hover:bg-gray-800'>
            <PencilAltIcon className='text-gray-400 dark:text-gray-700 w-8 h-8' />
            <p className='text-gray-400 dark:text-gray-700'>Start a new message</p>
          </button>
        </div>
      </div>
    </div>
  );
}
