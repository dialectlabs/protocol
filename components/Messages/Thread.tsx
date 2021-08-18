import React, { FormEvent, useState } from 'react';
import {useRouter} from 'next/router';
import useSWR from 'swr';
import { ArrowNarrowRightIcon, ArrowSmRightIcon } from '@heroicons/react/outline';
import useApi from '../../utils/ApiContext';
import * as anchor from '@project-serum/anchor';
import {threadFetch} from '../../api';
import {display} from '../../utils';
import MessageMember from './MessageMember';

export default function Thread(): JSX.Element {
  const router = useRouter();
  const { program } = useApi();
  const { threadId } = router.query;
  const [text, setText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  console.log('threadId', threadId);
  // const {data: thread} = useSWR(
  //   threadId ? [
  //     '/m/', program, new anchor.web3.PublicKey(threadId),
  //   ] : null, threadFetch, {
  //     onSuccess: () => {
  //       console.log('success fetching thread');
  //     },
  //     onError: (error) => {
  //       console.log('error fetching thread', error);
  //     },
  //   }
  // );

  const onMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
  };
  // console.log('thread', thread);
  const members = []; //thread?.thread.members;
  const disabled = text.length <= 0 || text.length > 280 || sending;
  return (
    <div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
        <div className='text-xs dark:text-gray-400'>Members – {members && members.length + 1 || 0}/8</div>
        <div className='flex flex-wrap items-start'>
          {members?.map((member, index) => (
            <MessageMember
              key={index}
              member={display(member.key)}
            />
          ))}
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
