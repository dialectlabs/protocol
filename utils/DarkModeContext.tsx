import React, { createContext, useContext, useState } from 'react';
import { ProviderPropsType as PropsType } from './';

type ValueType = {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};
export const DarkModeContext = createContext(null as ValueType | null);

// type PropsType = {
//   children: JSX.Element,
// }

export const DarkModeContextProvider = (props: PropsType): JSX.Element => {
  const [darkMode, setDarkMode] = useState(false);
  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {props.children}
    </DarkModeContext.Provider>
  );
};

export default function useDarkMode(): ValueType {
  return useContext(DarkModeContext) as ValueType;
}
