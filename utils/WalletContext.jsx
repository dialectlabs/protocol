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
exports.WalletContextProvider = exports.WalletContext = void 0;
const web3_js_1 = require("@solana/web3.js");
const Wallet_1 = __importDefault(require("./Wallet"));
const react_1 = __importStar(require("react"));
exports.WalletContext = (0, react_1.createContext)({
    wallet: null,
    networkName: process.env.ENVIRONMENT || 'localnet',
    setNetworkName: (_) => {
        _;
    },
    onConnect: () => undefined,
    onDisconnect: () => undefined,
});
const WalletContextProvider = (props) => {
    const [selectedWallet, setSelectedWallet] = (0, react_1.useState)(null);
    const [urlWallet, setUrlWallet] = (0, react_1.useState)(null);
    const [networkName, setNetworkName] = (0, react_1.useState)(process.env.NEXT_PUBLIC_SOLANA_ENVIRONMENT || 'localnet');
    const network = (0, react_1.useMemo)(() => {
        if (networkName === 'localnet') {
            return 'http://127.0.0.1:8899';
        }
        return (0, web3_js_1.clusterApiUrl)(networkName);
    }, [networkName]);
    const [providerUrl] = (0, react_1.useState)('https://www.sollet.io');
    // const connection = useMemo(() => new Connection(network), [network]);
    (0, react_1.useEffect)(() => {
        const w = new Wallet_1.default(providerUrl, network);
        setUrlWallet(w);
    }, [providerUrl, network]);
    const [, setConnected] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (selectedWallet) {
            selectedWallet.on('connect', () => {
                setConnected(true);
            });
            selectedWallet.on('disconnect', () => {
                setConnected(false);
            });
            void selectedWallet.connect();
            return () => {
                void selectedWallet.disconnect();
            };
        }
    }, [selectedWallet]);
    return (<exports.WalletContext.Provider value={{
            wallet: selectedWallet,
            networkName,
            setNetworkName,
            onConnect: () => setSelectedWallet(urlWallet),
            onDisconnect: () => setSelectedWallet(null),
        }}>
      {props.children}
    </exports.WalletContext.Provider>);
};
exports.WalletContextProvider = WalletContextProvider;
function useWallet() {
    return (0, react_1.useContext)(exports.WalletContext);
}
exports.default = useWallet;
