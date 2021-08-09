import React from 'react';

export default function Messages(): JSX.Element {
  return (
    <div className="w-full flex flex-1 shadow-md dark:shadow-none rounded-md border dark:border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-900 bg-gray-50 text-gray-700 dark:text-gray-400">
      <div className="w-1/3 border-r-2 dark:border-r dark:border-gray-600"></div>
      <div className="w-2/3"></div>
    </div>
  );
}
