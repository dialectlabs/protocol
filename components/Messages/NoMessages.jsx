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
const react_1 = __importStar(require("react"));
const router_1 = require("next/router");
const outline_1 = require("@heroicons/react/outline");
const copy_to_clipboard_1 = __importDefault(require("copy-to-clipboard"));
function NoMessages() {
    const router = (0, router_1.useRouter)();
    const [copied, setCopied] = (0, react_1.useState)(false);
    const publicKey = 'D1ALECTfeCZt9bAbPWtJk7ntv24vDYGPmyS7swp7DY5h';
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
    return (<div className='flex flex-col w-full justify-center items-center'>
      <button className='flex rounded-lg p-4 flex-col items-center bg-none hover:bg-gray-200 dark:hover:bg-gray-800' onClick={() => router.push('/m/new')}>
        <outline_1.PencilAltIcon className='text-gray-400 dark:text-gray-700 w-8 h-8'/>
        <p className='text-sm text-gray-400 dark:text-gray-700'>Start a new message</p>
      </button>
      <p className="mt-6 sm:mt-12 text-lg text-center">
        <div className='flex flex-col flex-grow items-center space-y-2 text-gray-400 dark:text-gray-700'>
          <div className='text-sm text-gray-400 dark:text-gray-700'>Say hello</div>
          <button className='text-xs flex items-center space-x-1 px-3 py-1 border rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-900' onClick={handleCopy}>
            <code>{publicKey}</code>
            {copied ? (<div><outline_1.CheckIcon className='w-4 h-4 text-green-500'/></div>) : (<div><outline_1.ClipboardCopyIcon className='w-4 h-4'/></div>)}
          </button>
        </div>
      </p>
    </div>);
}
exports.default = NoMessages;
