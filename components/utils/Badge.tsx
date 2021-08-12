import React from 'react';
import { PlusIcon } from '@heroicons/react/solid';

type PropsType = {
  className?: string,
  text: string,
  color?: string,
}

export default function Badge({className, text, color}: PropsType): JSX.Element {
  let baseClassName = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  switch (color) {
    case 'gray':
      baseClassName = `${baseClassName} border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400`;
      break;
    default: // red
      baseClassName = `${baseClassName} bg-red-700 dark:bg-red-600 text-white`;
      break;
  }
  return (
    <div
      className={`${baseClassName} ${className}`}
    >
      {text}
    </div>
  );
}