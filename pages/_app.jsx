"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("tailwindcss/tailwind.css");
require("../styles/globals.css");
const react_1 = __importDefault(require("react"));
const Footer_1 = __importDefault(require("../components/Footer"));
const Navbar_1 = __importDefault(require("../components/Navbar"));
const WalletContext_1 = require("../utils/WalletContext");
const ApiContext_1 = require("../utils/ApiContext");
const WalletContext_2 = __importDefault(require("../utils/WalletContext"));
const next_themes_1 = require("next-themes");
function AppWithContext(props) {
    return (<next_themes_1.ThemeProvider attribute='class' defaultTheme='dark'>
      <WalletContext_1.WalletContextProvider>
        <ApiContext_1.ApiContextProvider>
          <App {...props}/>
        </ApiContext_1.ApiContextProvider>
      </WalletContext_1.WalletContextProvider>
    </next_themes_1.ThemeProvider>);
}
function App({ Component, pageProps }) {
    const { networkName } = (0, WalletContext_2.default)();
    return (<div className='min-h-screen'>
      <div className="flex flex-col h-screen py-0 dark:bg-black">
        <main className="relative flex flex-col max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8 h-screen">
          {networkName === 'devnet' && (<div className='z-10 fixed top-0 left-1/2 transform -translate-x-1/2 flex justify-center'>
              <div className='flex items-center text-xs text-center text-white bg-red-700 dark:bg-red-600 px-2 py-1 rounded-b-md border border-white dark:border-black'>
                {/* <ExclamationIcon className='w-4 h-4' /> */}
                devnet
              </div>
            </div>)}
          <Navbar_1.default />
          <Component {...pageProps}/>
          <Footer_1.default />
        </main>
      </div>
    </div>);
}
exports.default = AppWithContext;
