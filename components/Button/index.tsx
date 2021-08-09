import React from 'react';

type PropsType = {
    className?: string;
    onClick: () => void;
    children: JSX.Element;
}

export const BUTTON_STYLES = 'relative inline-flex items-center border-white dark:border-black px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white bg-red-700 dark:bg-red-600 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-700 dark:text-gray-300';

export default function Button({className = '', onClick, children}: PropsType): JSX.Element {
  return (
    <button
      type="button"
      className={`${BUTTON_STYLES} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
