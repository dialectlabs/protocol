"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Button_1 = __importDefault(require("../Button"));
const Menu_1 = __importDefault(require("..//Menu"));
const outline_1 = require("@heroicons/react/outline");
const solid_1 = require("@heroicons/react/solid");
const react_1 = __importStar(require("react"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const router_1 = require("next/router");
const utils_1 = require("../../utils");
const next_themes_1 = require("next-themes");
const networkNavigation = [
    {
        name: 'mainnet (coming soon)',
        disabled: true,
        networkName: 'mainnet-beta',
    },
    { name: 'testnet (coming soon)', disabled: true, networkName: 'testnet' },
    { name: 'devnet', disabled: false, networkName: 'devnet' },
    { name: 'localnet', disabled: false, networkName: 'localnet' },
];
const walletNavigation = [
    {
        name: 'Messages',
        disabled: false,
    },
    {
        name: 'Profile',
        disabled: false,
    },
    {
        name: 'Disconnect',
        disabled: false,
    },
];
function Navbar() {
    const router = (0, router_1.useRouter)();
    const { wallet, networkName, setNetworkName, onConnect: onWalletConnect, onDisconnect: onWalletDisconnect, } = (0, WalletContext_1.default)();
    const { theme, setTheme } = (0, next_themes_1.useTheme)();
    const [isLight, setIsLight] = (0, react_1.useState)(false);
    // needed bc raw use of theme isn't giving the right icon below
    (0, react_1.useEffect)(() => {
        setIsLight(theme === 'light');
    }, [theme]);
    const displayPubkey = (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) ? (0, utils_1.display)(wallet.publicKey) : undefined;
    return (<div>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-16">
          {/* logo */}
          <div className="flex">
            <div className="hidden sm:flex flex-shrink-0 flex items-center">
              <button onClick={() => router.push('/')}>
                <h4>dialect</h4>
              </button>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4"></div>
          </div>
          {/* darkmode toggle */}
          <div className="flex items-center">
            <div className="flex">
              <button type="button" className="border-none bg-none" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {!isLight ? (<outline_1.SunIcon className="icon mr-4 h-5 w-5" aria-hidden="true"/>) : (<outline_1.MoonIcon className="icon mr-4 h-5 w-5" aria-hidden="true"/>)}
              </button>
            </div>
            {/* login */}
            <div className="flex-shrink-0">
              {wallet && wallet.connected ? (<Menu_1.default className="border-r-2 rounded-r-none" button={<>
                      <span className="sr-only">Open wallet menu</span>
                      <outline_1.UserCircleIcon className="btn-txt -ml-1 mr-2 h-5 w-5" aria-hidden="true"/>
                      <span className='btn-txt'>{displayPubkey}</span>
                    </>} items={walletNavigation.map((item) => ({
                ...item,
                onClick: () => {
                    if (item.name === 'Profile') {
                        router.push('/profile');
                    }
                    else if (item.name === 'Messages') {
                        router.push('/');
                    }
                    else if (item.name === 'Disconnect') {
                        onWalletDisconnect();
                    }
                },
                itemChildren: (<div className='flex items-center px-4 py-2 space-x-2 flex-grow hover:bg-gray-100 dark:hover:bg-gray-800'>
                        {item.name === 'Profile' ? (<outline_1.UserCircleIcon className="w-4 h-4"/>) : item.name === 'Disconnect' ? (<outline_1.XIcon className="w-4 h-4"/>) : (<outline_1.ChatIcon className="w-4 h-4"/>)}
                        <span>{item.name}</span>
                      </div>),
            }))}/>) : (<Button_1.default className="border-r-2 rounded-r-none border-white dark:border-black" onClick={onWalletConnect}>
                  <>
                    <solid_1.PlusIcon className="btn-txt -ml-1 mr-2 h-5 w-5" aria-hidden="true"/>
                    <span className='btn-txt'>Connect wallet</span>
                  </>
                </Button_1.default>)}
            </div>
            {/* network */}
            <div className="flex md:ml-0 md:flex-shrink-0 md:items-center">
              <Menu_1.default className="rounded-l-none" button={<>
                    <span className="sr-only">Open wallet menu</span>
                    {networkName === 'localnet' ? (<outline_1.BeakerIcon className="btn-txt w-5 h-5"/>) : networkName === 'devnet' ? (<outline_1.CubeTransparentIcon className="btn-txt w-5 h-5"/>) : networkName === 'testnet' ? (<outline_1.CubeIcon className="btn-txt w-5 h-5"/>) : (<outline_1.LightningBoltIcon className="btn-txt w-5 h-5"/>)}
                  </>} items={networkNavigation.map((item) => ({
            ...item,
            onClick: () => setNetworkName(item.networkName),
            itemChildren: (<div className={`flex items-center px-4 py-2 space-x-2 flex-grow hover:bg-gray-100 dark:hover:bg-gray-800 ${networkName === item.networkName && 'bg-gray-100 dark:bg-gray-800'}`}>
                      {item.networkName === 'localnet' ? (<outline_1.BeakerIcon className="w-4 h-4"/>) : item.networkName === 'devnet' ? (<outline_1.CubeTransparentIcon className="w-5 h-5"/>) : item.networkName === 'testnet' ? (<outline_1.CubeIcon className="w-5 h-5"/>) : (<outline_1.LightningBoltIcon className="w-4 h-4"/>)}
                      <span>{item.name}</span>
                    </div>),
        }))}/>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
exports.default = Navbar;
