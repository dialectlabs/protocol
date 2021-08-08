import React, { createContext, useContext, useState } from 'react';
import { ProviderPropsType as PropsType } from './';

type ValueType = {};
export const WalletContext = createContext<ValueType>({});

export const WalletContextProvider = (props: PropsType): JSX.Element => {
  return (
    <>
      <WalletContext.Provider value={{}}>
        {props.children}
      </WalletContext.Provider>
    </>
  );
};

export default function useWallet(): ValueType {
  return useContext(WalletContext) as ValueType;
}
