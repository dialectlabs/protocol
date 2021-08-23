import React, {useState} from 'react';
import { XIcon } from '@heroicons/react/outline';
import useWallet from '../../utils/WalletContext';
import { display } from '../../utils';

type PropsType = {
  index: number,
  member: string,
  deletable?: boolean | undefined,
  onDelete?: (arg0: number) => void | undefined,
}

export default function MessageMember({index, member, deletable = false, onDelete = (_idx: number) => { _idx; }}: PropsType): JSX.Element {
  const [hover, setHover] = useState<boolean>(false);
  const { wallet } = useWallet();
  const isMe = wallet?.publicKey.toString() === member;
  return (
    <div
      className='flex space-x-2 py-1 items-center px-2 rounded-md text-sm border border-gray-400 dark:border-gray-600 bg-white dark:bg-black text-gray-800 dark:text-gray-200 mr-3 mb-2 cursor-pointer'
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>{`${display(member)}`}</span>
      {isMe && (<span className='opacity-60'>{' (You)'}</span>)}
      {deletable && hover && !isMe ? (
        <XIcon className='w-4 h-4 hover:cursor-pointer' onClick={() => deletable && onDelete(index)}/>
      ) : (
        <div className='w-2 h-2 rounded-full bg-green-500 dark:bg-green-600' />
      )}
    </div>
  );
}