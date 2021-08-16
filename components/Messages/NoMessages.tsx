import React from 'react';
import { PencilAltIcon } from '@heroicons/react/outline';

export default function NoMessages(): JSX.Element {
  return (
    <div className='flex justify-center items-center'>
      <button className='flex rounded-lg p-4 flex-col items-center bg-none hover:bg-gray-200 dark:hover:bg-gray-800'>
        <PencilAltIcon className='text-gray-400 dark:text-gray-700 w-8 h-8' />
        <p className='text-gray-400 dark:text-gray-700'>Start a new message</p>
      </button>
    </div>
  );
}