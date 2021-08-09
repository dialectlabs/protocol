import React from 'react';
import { ProtectedPage } from '../Page';
import WalletAccount from '../Profile/WalletAccount';

type SectionTitleProps = {
  title: string,
}

function SectionTitle({ title }: SectionTitleProps): JSX.Element {
  return (
    <div className='align-left font-crimson text-4xl text-gray-800 dark:text-gray-200'>{title}</div>
  );
}

export default function Profile(): JSX.Element {
  return (
    <ProtectedPage title={'Profile'}>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-center">Manage your profile, message settings, &etc.</p>
        <div className='h-12' />
        <SectionTitle title='wallet' />
        <WalletAccount />
      </div>
    </ProtectedPage>
  );
}
