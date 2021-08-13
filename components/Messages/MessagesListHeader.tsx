import React from 'react';
import { PencilAltIcon } from '@heroicons/react/outline';

export default function Messages(): JSX.Element {
  return (
    <div className='p-4 border-b border-gray-200 dark:border-gray-600'>
      <div className='flex justify-end'>
        <button className='p-2 rounded-full border border-gray-50 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'>
          <PencilAltIcon className='w-5 h-5' />
        </button>
      </div>
    </div>
  );
}