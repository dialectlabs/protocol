import React, { FormEvent } from 'react';
import { ArrowNarrowRightIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';

import Badge from '../utils/Badge';
import MessageMember from './MessageMember';

type PropsType = {
  members: string[],
  editing?: boolean,
  input?: string,
  status: string | null,
  setInput?: (s: string) => void,
  onInputSubmit?: (event: FormEvent<HTMLFormElement>) => void,
};

export default function ThreadHeader({members, editing, input, setInput, onInputSubmit, status}: PropsType): JSX.Element {
  return (
    <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
      <div className='flex items-center space-x-2 mb-1'>
        <div className='text-xs dark:text-gray-400'>Members – {members && members.length || 0}/8</div>
        <Badge color='gray' bold>
          <div className='flex space-x-1 items-center'>
            <ExclamationIcon className='w-4 h-4' />
            <span>unencrypted</span>
          </div>
        </Badge>
      </div>
      <div className='flex flex-wrap items-start'>
        {members?.map((member, index) => (
          <MessageMember
            key={index}
            index={index}
            member={member}
          />
        ))}
        {editing && members.length < 8 && (
          <form className='m-0' onSubmit={onInputSubmit}>
            <div className='flex flex-col'>
              <div className='relative flex items-center'>
                <input
                  type='text'
                  value={input}
                  onChange={(e) => setInput && setInput(e.target.value)}
                  placeholder='Enter a public key'
                  className='w-96 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-black border rounded-md px-2 py-1 border-gray-400 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 pr-10'
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  {(status === 'timeout' || status === 'fetching') ? (
                    null
                  ) : status === 'invalid' || status === 'duplicate' ? (
                    <XIcon className='w-4 h-4 mr-0 hover:cursor-pointer' onClick={() => setInput && setInput('')}/>
                  ) : status === 'valid' ? (
                    <div className='w-2 h-2 rounded-full bg-green-500 dark:bg-green-600' />
                  ) : status === null ? (
                    <div className='w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-600' />
                  ) : null}
                </span>
              </div>
              <div className='flex justify-between'>
                <div className='text-xs'>
                  {
                    status === 'valid' ? 'Valid address' :
                    status === 'invalid' ? 'Invalid address' :
                    status === 'duplicate' ? 'Duplicate address' :
                    null
                  }
                </div>
                {status === 'valid' && (
                  <div className='flex text-xs items-center'>
                    enter
                    <ArrowNarrowRightIcon className='h-4 w-4' />
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
