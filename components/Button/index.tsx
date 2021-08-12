import React from 'react';

type PropsType = {
  className?: string;
  onClick?: () => void;
  children: JSX.Element;
  disabled?: boolean;
  secondary?: boolean;
};

export const BUTTON_STYLES =
  'relative inline-flex items-center border-white dark:border-black px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white dark:text-white bg-red-700 dark:bg-red-600 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-700 dark:text-gray-300 disabled:bg-red-300 dark:disabled:opacity-70 disabled:cursor-not-allowed';

export const BUTTON_STYLES_SECONDARY = 'px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800';

export default function Button({
  className = '',
  onClick,
  children,
  disabled,
  secondary,
}: PropsType): JSX.Element {
  return (
    <button
      type="button"
      className={`${secondary ? BUTTON_STYLES_SECONDARY : BUTTON_STYLES} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
