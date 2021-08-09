import React, { Fragment } from 'react';
import { Menu as TMenu, Transition } from '@headlessui/react';
import { BUTTON_STYLES } from '../Button';

export type ItemType = {
  name: string;
  disabled: boolean;
  onClick: () => void;
  itemChildren: JSX.Element;
};

type PropsType = {
  button: JSX.Element;
  items: ItemType[];
  className?: string;
};

function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function Menu({
  button,
  items,
  className = '',
}: PropsType): JSX.Element {
  return (
    <TMenu as="div" className="relative">
      {({ open }: { open: boolean }) => (
        <>
          <div>
            <TMenu.Button className={`${BUTTON_STYLES} ${className}`}>
              {button}
            </TMenu.Button>
          </div>
          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <TMenu.Items
              static
              className="flex flex-col dark:bg-gray-900 dark:border-2 dark:border-gray-700 origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              {items.map((item) => (
                <TMenu.Item key={item.name}>
                  {({ active }) => (
                    <button
                      disabled={item.disabled}
                      onClick={item.onClick}
                      className={classNames(
                        active && !item.disabled
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'cursor-default',
                        `flex flex-grow space-x-2 items-center block px-4 py-2 text-sm ${
                          !item.disabled ? 'text-gray-800' : 'text-gray-400'
                        } ${
                          !item.disabled
                            ? 'dark:text-gray-300'
                            : 'dark:text-gray-500'
                        } dark:bg-gray-900`
                      )}
                    >
                      {item.itemChildren}
                    </button>
                  )}
                </TMenu.Item>
              ))}
            </TMenu.Items>
          </Transition>
        </>
      )}
    </TMenu>
  );
}
