import React, { FormEvent, useState } from 'react';
import {useRouter} from 'next/router';
import useSWR from 'swr';
import { ArrowNarrowRightIcon, ArrowSmRightIcon } from '@heroicons/react/outline';
import useApi from '../../utils/ApiContext';
import useWallet from '../../utils/WalletContext';
import * as anchor from '@project-serum/anchor';
import {messageMutate, messagesFetch, threadFetch} from '../../api';
import {display} from '../../utils';
import MessageMember from './MessageMember';
import Wallet from '../../../solana/sol-wallet-adapter/dist/cjs';

export default function Thread(): JSX.Element {
  const router = useRouter();
  const { wallet } = useWallet();
  const { program } = useApi();
  const { threadId } = router.query;
  const [text, setText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const {data: thread} = useSWR(
    program && threadId ? [
      `/m/${threadId}`, program, threadId,
    ] : null,
    threadFetch, {
      refreshInterval: 500
    }
  );
  const {data: messages} = useSWR(threadId && program && thread ? [`/m/${threadId}/messages`, program, thread] : null, messagesFetch, {
  });

  const {data: mutatedMessages} = useSWR(sending ? ['/messages/mutate', program, thread?.publicKey.toString(), text] : null, messageMutate, {
    onSuccess: (data) => {
      setSending(false);
      setText('');
    }, 
    onError: (error) => {
      setSending(false);
    },
  });

  const onMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
  };
  const members = wallet ? thread?.thread.members : [];
  const disabled = text.length <= 0 || text.length > 280 || sending;
  return (
    <div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
        <div className='text-xs dark:text-gray-400'>Members – {members && members.length || 0}/8</div>
        <div className='flex flex-wrap items-start'>
          {members?.map((member, index) => (
            <MessageMember
              key={index}
              member={member.key.toString()}
            />
          ))}
        </div>
      </div>
      <div className='px-3 py-2 flex-grow overflow-y-auto flex flex-col flex-col-reverse space-y-2 space-y-reverse justify-start flex-col-reverse'>
        {messages?.map((message, index) => (
          <div key={index} className={`flex items-start space-x-2 w-full ${message.message.owner.toString() === wallet?.publicKey.toString() && 'justify-end'}`}>
            <div className={`flex flex-col ${message.message.owner.toString() === wallet?.publicKey.toString() && 'items-end'}`}>
              <div className='text-xs opacity-50'>{message.message.owner.toString() === wallet?.publicKey.toString() ? 'You' : display(message.message.owner)}</div>
              <div className='flex space-x-2 items-center text-sm text-gray-800 dark:text-gray-200'>
                {message.message.text}
              </div>
            </div>
          </div>
        ))}
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
