import React, { KeyboardEvent, FormEvent, useState } from 'react';
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
import Badge from '../utils/Badge';
import ThreadHeader from './ThreadHeader';
import MessageInput from './MessageInput';

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
  const onEnterPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
              <div className={`flex break-word space-x-2 items-center text-sm text-gray-800 dark:text-gray-200 ${message.message.owner.toString() === wallet?.publicKey.toString() ? 'text-right ml-8' : 'mr-8'}`}>
                {message.message.text}
              </div>
            </div>
          </div>
        ))}
        {displayFetchDisclaimer && (<div className='w-full text-center italic text-xs opacity-70'>&mdash; Fetching older messages coming soon &mdash;</div>)}
      </div>
      <MessageInput
        text={text}
        setText={setText}
        onSubmit={onMessageSubmit}
        onEnterPress={onEnterPress}
        disabled={disabled}
      />
    </div>
  );
}
