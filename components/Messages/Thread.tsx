import React, { FormEvent, useState } from 'react';
import {useRouter} from 'next/router';
import useSWR from 'swr';
import { ArrowNarrowRightIcon, ArrowSmRightIcon, UserIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';
import useApi from '../../utils/ApiContext';
import useWallet from '../../utils/WalletContext';
import * as anchor from '@project-serum/anchor';
import {messageMutate, messagesFetch, threadFetch} from '../../api';
import {display} from '../../utils';
import MessageMember from './MessageMember';
import Wallet from '../../../solana/sol-wallet-adapter/dist/cjs';
import Badge from '../utils/Badge';
import ThreadHeader from './ThreadHeader';

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
  const {data: messages} = useSWR(threadId && program && thread ? [`/m/${threadId}/messages`, program, thread] : null, messagesFetch);

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
  const onEnterPress = (e: any) => {
    if(e.keyCode == 13 && e.shiftKey == false) {
      e.preventDefault();
      setSending(true);
    }
  };
  const members = wallet ? thread?.thread.members : [];
  const disabled = text.length <= 0 || text.length > 280 || sending;
  const displayFetchDisclaimer: boolean = messages && messages[messages.length - 1]?.message?.idx > 1 || false;
  return (
    <div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <ThreadHeader members={members?.map(m => m.key.toString()) || []} />
      <div className='px-3 py-2 flex-grow overflow-y-auto flex flex-col flex-col-reverse space-y-2 space-y-reverse justify-start flex-col-reverse'>
        {messages?.map((message, index) => (
          <div key={index} className={`flex items-start space-x-3 ${message.message.owner.toString() === wallet?.publicKey.toString() && 'flex-row-reverse space-x-reverse'}`}>
            <UserIcon className='w-7 h-7 bg-gray-200 dark:bg-gray-700 p-2 rounded-full'/>
            <div className={`flex flex-col ${message.message.owner.toString() === wallet?.publicKey.toString() && 'items-end'}`}>
              <div className='text-xs opacity-50'>{message.message.owner.toString() === wallet?.publicKey.toString() ? 'You' : display(message.message.owner)}</div>
              <div className={`flex break-all space-x-2 items-center text-sm text-gray-800 dark:text-gray-200 ${message.message.owner.toString() === wallet?.publicKey.toString() && 'text-right'}`}>
                {message.message.text}
              </div>
            </div>
          </div>
        ))}
        {displayFetchDisclaimer && (<div className='w-full text-center italic text-xs opacity-70'>&mdash; Fetching older messages coming soon &mdash;</div>)}
      </div>
      <div className='flex flex-col px-3 pb-2'>
        <form onSubmit={onMessageSubmit}>
          <div className='relative'>
            <div className='visible text-sm break-words py-1 pl-2 pr-11'>{text || 'h'}</div>
            <div className='absolute top-0 w-full h-full flex flex-grow items-center'>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onEnterPress}
                placeholder='Write something'
                className='resize-none h-full w-full text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-black border rounded-md px-2 py-1 border-gray-400 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 pr-10'
              />
              <button className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:cursor-not-allowed" disabled={disabled}>
                <ArrowSmRightIcon className={`opacity-100 h-5 w-5 text-white text-white rounded-full bg-red-700 dark:bg-red-600 ${disabled ? 'opacity-70' : ''}`} />
              </button>
            </div>
          </div>
        </form>
        <div className='flex justify-between'>
          <div className='text-xs pl-1'>{text.length}/280</div>
          {!disabled && (
            <div className='flex text-xs items-center pr-1'>
              enter
              <ArrowNarrowRightIcon className='h-4 w-4' />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
