import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import {PencilAltIcon, CheckIcon, ClipboardCopyIcon} from '@heroicons/react/outline';
import copy from 'copy-to-clipboard';

export default function NoMessages(): JSX.Element {
  const router = useRouter();
  const [copied, setCopied] = useState<boolean>(false);
  const publicKey = 'D1ALECTfeCZt9bAbPWtJk7ntv24vDYGPmyS7swp7DY5h';
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  } , [copied]);
  const handleCopy = () => {
    if (typeof publicKey === 'string') {
      copy(publicKey || '');
      setCopied(true);
    }
  };
  return (
    <div className='flex flex-col w-full justify-center items-center'>
      <button
        className='flex rounded-lg p-4 flex-col items-center bg-none hover:bg-gray-200 dark:hover:bg-gray-800'
        onClick={() => router.push('/m/new')}
      >
        <PencilAltIcon className='text-gray-400 dark:text-gray-700 w-8 h-8' />
        <p className='text-sm text-gray-400 dark:text-gray-700'>Start a new message</p>
      </button>
      <p className="mt-6 sm:mt-12 text-lg text-center">
        <div className='flex flex-col flex-grow items-center space-y-2 text-gray-400 dark:text-gray-700'>
          <div className='text-sm text-gray-400 dark:text-gray-700'>Say hello</div>
          <button
            className='text-xs flex items-center space-x-1 px-3 py-1 border rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-900'
            onClick={handleCopy}
          >
            <code>{publicKey}</code>
            {copied ? (
              <div><CheckIcon className='w-4 h-4 text-green-500' /></div>
            ) : (
              <div><ClipboardCopyIcon className='w-4 h-4' /></div>
            )}
          </button>
        </div>
      </p>
    </div>
  );
}