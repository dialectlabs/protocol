import React from 'react';
import useSWR from 'swr';
import useApi from '../../utils/ApiContext';
import { ThreadAccount } from '../../api';
import { display } from '../../utils';
import { messagesFetch } from '../../api';

type PropsType = {
  thread: ThreadAccount,
}

export default function MessagePreview({thread}: PropsType): JSX.Element {
  const {program} = useApi();
  // const {data: messages} = useSWR(thread ? ['/messages', program, thread] : null, messagesFetch, {
  //   onSuccess: (data) => {
  //     console.log('messages success', data);
  //   },
  //   onError: (error) => {
  //     console.log('error', error);
  //   },
  // });
  console.log('thread in preview', thread);
  // console.log('messages', messages);

  return (
    <div>
      <div>{display(thread.publicKey)}</div>
      {/* {messages && messages?.length > 0 && (
        <div className='text-white'>{messages[0].message.text}</div>
      )} */}
    </div>
  );
}