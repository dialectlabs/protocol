"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const outline_1 = require("@heroicons/react/outline");
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const api_1 = require("../../api");
function MessageInput({ text, setText, onSubmit, onEnterPress, disabled }) {
    const { connection } = (0, ApiContext_1.default)();
    const { wallet } = (0, WalletContext_1.default)();
    const { data } = (0, swr_1.default)(connection && wallet ? ['/owner', wallet, connection] : null, api_1.ownerFetcher);
    const balance = (data === null || data === void 0 ? void 0 : data.lamports) ? data.lamports / 1e9 : undefined;
    return (<div className='flex flex-col px-3 pb-2'>
      <form onSubmit={onSubmit}>
        <div className='relative'>
          <div className='visible text-sm break-words py-1 pl-2 pr-11'>{text || 'h'}</div>
          <div className='absolute top-0 w-full h-full flex flex-grow items-center'>
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onEnterPress} placeholder='Write something' className='resize-none h-full w-full text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-black border rounded-md px-2 py-1 border-gray-400 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 pr-10'/>
            <button className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:cursor-not-allowed" disabled={disabled}>
              <outline_1.ArrowSmRightIcon className={`opacity-100 h-5 w-5 text-white text-white rounded-full bg-red-700 dark:bg-red-600 ${disabled ? 'opacity-70' : ''}`}/>
            </button>
          </div>
        </div>
      </form>
      <div className='flex justify-between'>
        <div className='flex space-x-3'>
          <div className='text-xs pl-1'>{text.length}/280</div>
          <div className='text-xs'>⊙ {balance || '–'}</div>
        </div>
        {!disabled && (<div className='flex text-xs items-center pr-1'>
            enter
            <outline_1.ArrowNarrowRightIcon className='h-4 w-4'/>
          </div>)}
      </div>
    </div>);
}
exports.default = MessageInput;
