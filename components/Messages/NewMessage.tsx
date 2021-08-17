import React, { FormEvent, useEffect, useState }  from 'react';
import useSWR from 'swr';
import { ArrowNarrowRightIcon, ArrowSmRightIcon, XIcon } from '@heroicons/react/outline';

import MessageMember from './MessageMember';
import useWallet from '../../utils/WalletContext';
import { display } from '../../utils';
import {accountInfoFetch} from '../../api';
import useApi from '../../utils/ApiContext';

let timeout: NodeJS.Timeout;

type Status = 'fetching' | 'timeout' | 'valid' | 'invalid' | 'duplicate' | null;

export default function NewMessage(): JSX.Element {
  const { wallet } = useWallet();
  const [members, setMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [input, setInput] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(true);
  const { connection } = useApi();
  const myPublicKeyStr = wallet?.publicKey?.toString();
  useSWR(
    status === 'fetching' ? ['/accountInfo', connection, input] : null,
    accountInfoFetch, {
      onSuccess: () => setStatus('valid'),
      onError: () => setStatus('invalid'),
    }
  ); 
  useEffect(() => {
    if (timeout) clearTimeout(timeout);
    setStatus(null);
    timeout = setTimeout(() => {
      if (input === '') {
        setStatus(null);
      } else if (input === myPublicKeyStr || members.includes(input)) {
        setStatus('duplicate');
      } else {
        setStatus('fetching');
      }
    }, 750);
  }, [input]);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== 'valid') return;
    members.push(input);
    setMembers([...members]);
    setInput('');
  };
  const onDelete = (idx: number) => {
    members.splice(idx, 1);
    setMembers([...members]);
  };
  useEffect(() => {
    if (text.length > 0 && text.length <= 280) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [text]);
  const onMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    
    event.preventDefault();
  };
  return (
    <div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
        <div className='text-xs dark:text-gray-400'>Members – {members.length + 1}/8</div>
        <div className='flex flex-wrap items-start'>
          {members.map((member, index) => (
            <MessageMember
              key={index}
              member={display(member)}
              deletable
              onDelete={onDelete}
            />
          ))}
          {members.length + 1 < 8 && (
            <form className='m-0' onSubmit={onSubmit}>
              <div className='flex flex-col'>
                <div className='relative flex items-center'>
                  <input
                    type='text'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='Enter a public key'
                    className='mb-2 w-96 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-black border rounded-md px-2 py-1 border-gray-400 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 pr-10'
                  />
                  <span className="mb-2 absolute inset-y-0 right-0 flex items-center pr-3">
                    {(status === 'timeout' || status === 'fetching') ? (
                      null
                    ) : status === 'invalid' || status === 'duplicate' ? (
                      <XIcon className='w-4 h-4 mr-0 hover:cursor-pointer' onClick={() => setInput('')}/>
                    ) : status === 'valid' ? (
                      <div className='w-2 h-2 rounded-full bg-green-500 dark:bg-green-600 mr-1' />
                    ) : status === null ? (
                      <div className='w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-600 mr-1' />
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
      <div className='flex flex-col px-3 pb-2'>
        <form onSubmit={onMessageSubmit}>
          <div className='relative flex items-center'>
            <input
              type='text'
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Write something'
              className='w-full text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-black border rounded-md px-2 py-1 border-gray-400 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 pr-10'
            />
            <button className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:cursor-not-allowed" disabled={disabled}>
              <ArrowSmRightIcon className={`opacity-100 h-5 w-5 text-white text-white rounded-full bg-red-700 dark:bg-red-600 ${disabled ? 'opacity-70' : ''}`} />
            </button>
          </div>
        </form>
        <div className='flex justify-between'>
          <div className='text-xs pl-1'>{text.length}/280</div>
          <div className='flex text-xs items-center pr-1'>
            enter
            <ArrowNarrowRightIcon className='h-4 w-4' />
          </div>
        </div>
      </div>
    </div>
  );
}
