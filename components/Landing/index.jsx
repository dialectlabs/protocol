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
const head_1 = __importDefault(require("next/head"));
const outline_1 = require("@heroicons/react/outline");
const solid_1 = require("@heroicons/react/solid");
const react_1 = __importStar(require("react"));
const copy_to_clipboard_1 = __importDefault(require("copy-to-clipboard"));
function Landing() {
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
    return (<>
      <head_1.default>
        <title>dialect</title>
        <link rel="icon" href="/favicon.ico"/>
        <meta property="og:title" content={'dialect'} key="ogtitle"/>
        <meta property="og:description" content={'On-chain Solana messaging protocol.'} key="ogdesc"/>
        <meta property="og:url" content={'dialect.to'} key="ogurl"/>
        
        <meta name="twitter:card" content="summary_large_image"/>
        <meta property="og:image" content={''}/>
      </head_1.default>
      <div className='flex flex-col flex-grow'>
        <h1 className="mt-12 sm:mt-36 text-5xl sm:text-8xl font-crimson dark:text-gray-200">dialect</h1>
        <p className="mb-8 sm:mb-14 text-lg text-center">
          <div className='flex justify-center'>
            <div>On-chain Solana messaging protocol. Encryption coming soon.</div>
          </div>
        </p>
        <div className='flex justify-center text-center'>
          <a rel="noreferrer" href='https://youtu.be/PePalNLsU-k' target='_blank' className='mb-8 sm:mb-16 rounded-md px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-900'>
            <div className='flex justify-center'>
              <div className='mb-2 p-2 rounded-full bg-gray-200 dark:bg-gray-900'>
                <solid_1.PlayIcon className='m-auto text-gray-600 dark:text-gray-200 w-12 h-12'/>
              </div>
            </div>
            <div className='text-lg text-gray-500 dark:text-gray-400'>Watch a demo</div>
          </a>
        </div>
        
        <p className="text-lg text-center mb-24 sm:mb-36">
          <div className='flex flex-col items-center space-y-2'>
            <div className='text-lg'>Drop us a line</div>
            <button className='text-sm flex items-center space-x-1 text-gray-600 dark:text-gray-400 px-3 py-1 border rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 break-all' onClick={handleCopy}>
              <code className='text-black dark:text-gray-300'>{publicKey}</code>
              {copied ? (<div><outline_1.CheckIcon className='w-4 h-4 text-green-500'/></div>) : (<div><outline_1.ClipboardCopyIcon className='w-4 h-4'/></div>)}
            </button>
          </div>
        </p>
      </div>
    </>);
}
exports.default = Landing;
