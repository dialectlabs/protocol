import React, { KeyboardEvent, FormEvent, useEffect, useState }  from 'react';
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
import MessageInput from './MessageInput';

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
  const onEnterPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if(e.keyCode == 13 && e.shiftKey == false) {
      e.preventDefault();
      setCreating(true);
    }
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
