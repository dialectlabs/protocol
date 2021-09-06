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
const outline_1 = require("@heroicons/react/outline");
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const utils_1 = require("../../utils");
function MessageMember({ index, member, deletable = false, onDelete = (_idx) => { _idx; } }) {
    const [hover, setHover] = (0, react_1.useState)(false);
    const { wallet } = (0, WalletContext_1.default)();
    const isMe = (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) === member;
    return (<div className='flex space-x-2 py-1 items-center px-2 rounded-md text-sm border border-gray-400 dark:border-gray-600 bg-white dark:bg-black text-gray-800 dark:text-gray-200 mr-3 mb-2 cursor-pointer' onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span>{`${(0, utils_1.display)(member)}`}</span>
      {isMe && (<span className='opacity-60'>{' (You)'}</span>)}
      {deletable && hover && !isMe ? (<outline_1.XIcon className='w-4 h-4 hover:cursor-pointer' onClick={() => deletable && onDelete(index)}/>) : (<div className='w-2 h-2 rounded-full bg-green-500 dark:bg-green-600'/>)}
    </div>);
}
exports.default = MessageMember;
