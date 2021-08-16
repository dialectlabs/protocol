import {CheckIcon} from '@heroicons/react/outline';
import {PlusIcon} from '@heroicons/react/solid';
import useSWR from 'swr';
import React, { useState } from 'react';
import { ProtectedPage } from '../Page';
import WalletAccount from './WalletAccount';
import ProfileAccount from './ProfileAccount';
import SettingsAccount from './SettingsAccount';
import useWallet from '../../utils/WalletContext';
import useApi from '../../utils/ApiContext';
import { settingsMutate } from '../../api';
import { settingsGet } from '../../api';
import Badge from '../utils/Badge';
import Button from '../Button';
import CircleProgress from '../utils/CircleProgress';
import router from 'next/router';

type SectionTitleProps = {
  title: string,
}

function SectionTitle({ title }: SectionTitleProps): JSX.Element {
  return (
    <div className='align-left font-crimson text-3xl text-gray-800 dark:text-gray-200'>{title}</div>
  );
}

export default function Profile(): JSX.Element {
  const {wallet} = useWallet();
  const {program, connection} = useApi();
  const { data, error } = useSWR(
    wallet && program && connection ? ['/settings', program, connection, wallet.publicKey] : null,
    settingsGet,
  );
  const loading: boolean = (!data && !error);
  const settingsNeedsCreating: boolean = !loading && !data;
  
  const [isCreatingSettings, setIsCreatingSettings] = useState(false);
  // TODO: Mutate on success
  useSWR(isCreatingSettings ? ['/mutate/settings', wallet, program] : null, settingsMutate, {
    onSuccess: (data) => {
      console.log('succeeded', data);
      setIsCreatingSettings(false);
    },
    onError: (error) => {
      console.log('error', error);
      setIsCreatingSettings(false);
    },
  });

  const disabled = !settingsNeedsCreating || isCreatingSettings || loading;

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
          <div className='cols-span-1 flex items-center space-x-3'>
            <div><SectionTitle title='profile' /></div>
            <div><Badge text={'coming soon'} color='gray' /></div>
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700' />
          <div className='cols-span-1 sm:cols-span-2'>
            <ProfileAccount />
          </div>
        </div>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700' />
        
        <div className='grid grid-cols-1 sm:grid-cols-3 pt-4 pb-16 flex'>
          <div className='cols-span-1 flex items-center space-x-3'>
            <div><SectionTitle title='settings' /></div>
            {settingsNeedsCreating && (<div><Badge text={'needs creating'} /></div>)}
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700' />
          <div className='cols-span-1 sm:cols-span-2'>
            <SettingsAccount />
          </div>
        </div>
        <div className='flex justify-end'>
        {settingsNeedsCreating ? (
          <Button
            disabled={disabled}
            onClick={() => setIsCreatingSettings(true)}
          >
            <>
              {!isCreatingSettings ? (
                <PlusIcon className='-ml-1 mr-2 btn-txt h-4 w-4' />
              ) : (
                <CircleProgress className='mr-2' />
              )}
              <div className='btn-txt'>{!isCreatingSettings ? 'Create Settings Account' : 'Creating...'}</div>
            </>
          </Button>
        ) : (
          <div className='flex'>
            <Button
              secondary
              onClick={() => router.back()}
              className='rounded-r-none w-24'
            >
              {<div>Back</div>}
            </Button>
            <Button
              disabled={true}
              className='rounded-l-none border-l-2 w-24'
            >
              <>
                <CheckIcon className='-ml-1 mr-1 btn-txt h-4 w-4' />
                <div className='btn-txt'>Saved</div>
              </>
            </Button>
          </div>
        )}
        </div>
        
      </>
    </ProtectedPage>
  );
}
