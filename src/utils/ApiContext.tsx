import React, { createContext, useContext, useEffect, useState } from 'react';
import { Connection } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { ProviderPropsType as PropsType } from './';
import useWallet from './WalletContext';
import idl from './dialect.json';
import programs from './programs.json';

type ValueType = {
  connection: Connection | null | undefined;
  program: anchor.Program | null;
};

export const ApiContext = createContext<ValueType | null>({
  connection: null,
  program: null,
});

export const ApiContextProvider = (props: PropsType): JSX.Element => {
  const { wallet, networkName } = useWallet();
  const [connection, setConnection] = useState<Connection | null>(null);
  useEffect(() => {
    if (networkName) {
      setConnection(
        new Connection(programs[networkName].clusterAddress, 'recent'),
      );
    }
  }, [networkName]);
  const [program, setProgram] = useState<anchor.Program | null>(null);

  useEffect(() => {
    if (wallet?.publicKey && connection && networkName) {
      anchor.setProvider(
        new anchor.Provider(
          connection,
          wallet,
          anchor.Provider.defaultOptions(),
        ),
      );
      const program = new anchor.Program(
        idl as anchor.Idl,
        new anchor.web3.PublicKey(programs[networkName].programAddress),
      );
      setProgram(program);
    }
  }, [wallet?.publicKey?.toString(), networkName, connection]);
  return (
    <ApiContext.Provider
      value={{
        connection: connection,
        program: program,
      }}
    >
      {props.children}
    </ApiContext.Provider>
  );
};

export function useApi(): ValueType {
  return useContext(ApiContext) as ValueType;
}

export default useApi;
