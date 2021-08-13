import React from 'react';
import { PencilAltIcon } from '@heroicons/react/outline';

export default function Messages(): JSX.Element {

  return (
    <div className="card-gray w-full flex flex-1 rounded-md border dark:border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-400">
        <div className="w-1/3 border-r-2 dark:border-r dark:border-gray-600">
          <div className='p-4 border-b border-gray-200 dark:border-gray-600'>
            <div className='flex justify-end'>
              <button className='p-2 rounded-full border border-gray-50 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'>
                <PencilAltIcon className='w-5 h-5' />
              </button>
            </div>
          </div>
        </div>
      <div className="w-2/3"></div>
    </div>
  );
}
