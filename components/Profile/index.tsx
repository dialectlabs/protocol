import React from 'react';
import { ProtectedPage } from '../Page';

export default function Profile(): JSX.Element {
  return (
    <ProtectedPage title={'Profile'}>
      <p className="text-gray-500 dark:text-gray-400">Edit your profile.</p>
    </ProtectedPage>
  );
}
