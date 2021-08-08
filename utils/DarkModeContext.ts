import React, { createContext } from 'react';

export type ValueType = {
  darkMode: boolean,
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>,
}
export const DarkModeContext = createContext(null as ValueType | null);

// type ReturnType = CounterContext.Provider;
// export const DarkModeContextProvider = (props: null | any) => {
//   const [darkMode, setDarkMode] = useState(false);
//   return (
//     <DarkModeContext.Provider value={{darkMode, setDarkMode}}>
//       {props.children}
//     </DarkModeContext.Provider>
//   );
// };
