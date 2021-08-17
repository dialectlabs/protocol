import React from 'react';
import { PencilAltIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';

export default function Messages(): JSX.Element {
  const router = useRouter();
  return (
    <div className='p-4 border-b border-gray-200 dark:border-gray-600'>
      <div className='flex justify-end'>
        <button
          className='p-2 rounded-full border border-gray-50 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
          onClick={() => router.push('/m/new')}
        >
          <PencilAltIcon className='w-5 h-5' />
        </button>
      </div>
    </div>
  );
}