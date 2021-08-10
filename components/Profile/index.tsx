import React from 'react';
import { ProtectedPage } from '../Page';
import WalletAccount from './WalletAccount';
import ProfileAccount from './WalletAccount';
import SettingsAccount from './SettingsAccount';

type SectionTitleProps = {
  title: string,
}

function SectionTitle({ title }: SectionTitleProps): JSX.Element {
  return (
    <div className='mb-4 align-left font-crimson text-3xl text-gray-800 dark:text-gray-200'>{title}</div>
  );
}

export default function Profile(): JSX.Element {
  return (
    <ProtectedPage title={'Profile'}>
      <>
        <p className="text-gray-500 dark:text-gray-400 text-center">Manage your profile, message settings, &etc.</p>
        <div className='h-12' />

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700' />

        <div className='grid grid-cols-1 sm:grid-cols-3 pt-4 pb-16 flex'>
          <div className='cols-span-1'>
            <SectionTitle title='wallet' />
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700' />
          <div className='cols-span-1 sm:cols-span-2'>
            <WalletAccount />
          </div>
        </div>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700' />

        <div className='grid grid-cols-1 sm:grid-cols-3 pt-4 pb-16 flex'>
          <div className='cols-span-1'>
            <SectionTitle title='profile' />
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700' />
          <div className='cols-span-1 sm:cols-span-2'>
            <ProfileAccount />
          </div>
        </div>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700' />
        
        <div className='grid grid-cols-1 sm:grid-cols-3 pt-4 pb-16 flex'>
          <div className='cols-span-1'>
            <SectionTitle title='settings' />
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700' />
          <div className='cols-span-1 sm:cols-span-2'>
            <SettingsAccount />
          </div>
        </div>
      </>
    </ProtectedPage>
  );
}
