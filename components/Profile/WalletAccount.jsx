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
exports.WalletComponent = void 0;
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/outline");
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const api_1 = require("../../api");
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const swr_1 = __importDefault(require("swr"));
const copy_to_clipboard_1 = __importDefault(require("copy-to-clipboard"));
function WalletComponent({ copyable, publicKey, balance }) {
    const [copied, setCopied] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (copied) {
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        }
    }, [copied]);
    const handleCopy = () => {
        if (typeof publicKey === 'string') {
            (0, copy_to_clipboard_1.default)(publicKey || '');
            setCopied(true);
        }
    };
    return (<div className='overflow-hidden'>
      <p className='text-xs dark:text-gray-400'>Public key</p>
      {copyable ? (<button className='text-md flex items-center space-x-1 text-gray-600 dark:text-gray-400' onClick={handleCopy}>
          <code className='text-black dark:text-gray-300'>{publicKey}</code>
          {copied ? (<div><outline_1.CheckIcon className='w-4 h-4 text-green-500'/></div>) : (<div><outline_1.ClipboardCopyIcon className='w-4 h-4'/></div>)}
        </button>) : (<code className='overflow-ellipsis text-sm text-gray-900 dark:text-gray-200'>{publicKey || '–'}</code>)}
      <div className='h-2'></div>
      <p className='text-xs dark:text-gray-400'>Balance</p>
      <div className='text-sm text-gray-900 dark:text-gray-200'>⊙ {balance || '–'}</div>
    </div>);
}
exports.WalletComponent = WalletComponent;
function WalletAccount() {
    const { connection } = (0, ApiContext_1.default)();
    const { wallet } = (0, WalletContext_1.default)();
    const { data } = (0, swr_1.default)(connection && wallet ? ['/owner', wallet, connection] : null, api_1.ownerFetcher);
    const balance = (data === null || data === void 0 ? void 0 : data.lamports) ? data.lamports / 1e9 : undefined;
    return (<WalletComponent publicKey={wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()} balance={balance} copyable/>);
}
exports.default = WalletAccount;
