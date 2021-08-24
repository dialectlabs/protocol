import React, { FormEvent, useEffect, useState }  from 'react';
import useSWR from 'swr';
import * as anchor from '@project-serum/anchor';
import { ArrowNarrowRightIcon, ArrowSmRightIcon, XIcon } from '@heroicons/react/outline';

import MessageMember from './MessageMember';
import useWallet from '../../utils/WalletContext';
import { display } from '../../utils';
import { accountInfoFetch, newGroupMutate, messageMutate, threadFetch, threadMutate, userThreadMutate } from '../../api';
import useApi from '../../utils/ApiContext';
import { PublicKey } from '@solana/web3.js';
import router from 'next/router';
import ThreadHeader from './ThreadHeader';

let timeout: NodeJS.Timeout;

type Status = 'fetching' | 
              'timeout' | 
              'valid' | 
              'invalid' | 
              'duplicate' | 
              null;

export default function NewMessage(): JSX.Element {
  const { connection, program } = useApi();
  const { wallet } = useWallet();
  const [members, setMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [input, setInput] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const myPublicKeyStr = wallet?.publicKey?.toString();

  useEffect(() => {
    if (wallet && members.length < 1) {
      members.push(wallet.publicKey.toString());
      setMembers([...members]);
    }
  }, [wallet]);
  useSWR(
    status === 'fetching' ? ['/accountInfo', connection, input] : null,
    accountInfoFetch,
    {
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
  const onMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
  };
  const { data: thread } = useSWR( creating ? [
    '/m/new',
    program,
    wallet,
    members.filter(m => m !== wallet?.publicKey.toString()),
    text
  ] : null, newGroupMutate, {
    onSuccess: (data) => {
      setCreating(false);
      router.push(`/m/${data.publicKey.toString()}`);
    },
  });
  const disabled = text.length <= 0 || text.length > 280 || creating || thread !== undefined;
  return (
    <div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <ThreadHeader
        members={members}
        editing
        input={input}
        setInput={setInput}
        onInputSubmit={onSubmit}
        status={status}
      />
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
