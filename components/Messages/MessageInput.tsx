import React, { KeyboardEvent, FormEvent } from 'react';
import { ArrowNarrowRightIcon, ArrowSmRightIcon } from '@heroicons/react/outline';

type PropsType = {
  text: string,
  setText: (text: string) => void,
  onSubmit: (e: FormEvent<HTMLFormElement>) => void,
  onEnterPress: (e: KeyboardEvent<HTMLTextAreaElement>) => void,
  disabled: boolean,
}

export default function MessageInput({text, setText, onSubmit, onEnterPress, disabled}: PropsType): JSX.Element {
  return (
    <div className='flex flex-col px-3 pb-2'>
      <form onSubmit={onSubmit}>
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
  );
}
