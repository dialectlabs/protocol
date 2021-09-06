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
const swr_1 = __importDefault(require("swr"));
const outline_1 = require("@heroicons/react/outline");
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const api_1 = require("../../api");
const utils_1 = require("../../utils");
const ThreadHeader_1 = __importDefault(require("./ThreadHeader"));
const MessageInput_1 = __importDefault(require("./MessageInput"));
function Thread() {
    var _a, _b;
    const router = (0, router_1.useRouter)();
    const { wallet } = (0, WalletContext_1.default)();
    const { program } = (0, ApiContext_1.default)();
    const { threadId } = router.query;
    const [text, setText] = (0, react_1.useState)('');
    const [sending, setSending] = (0, react_1.useState)(false);
    const { data: thread } = (0, swr_1.default)(program && threadId ? [
        `/m/${threadId}`, program, threadId,
    ] : null, api_1.threadFetch, {
        refreshInterval: 500
    });
    const { data: messages } = (0, swr_1.default)(threadId && program && thread ? [`/m/${threadId}/messages`, program, thread] : null, api_1.messagesFetch);
    const { data: mutatedMessages } = (0, swr_1.default)(sending ? ['/messages/mutate', program, thread === null || thread === void 0 ? void 0 : thread.publicKey.toString(), text] : null, api_1.messageMutate, {
        onSuccess: (data) => {
            setSending(false);
            setText('');
        },
        onError: (error) => {
            setSending(false);
        },
    });
    const onMessageSubmit = (event) => {
        event.preventDefault();
        setSending(true);
    };
    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            setSending(true);
        }
    };
    const members = wallet ? thread === null || thread === void 0 ? void 0 : thread.thread.members : [];
    const disabled = text.length <= 0 || text.length > 280 || sending;
    const displayFetchDisclaimer = messages && ((_b = (_a = messages[messages.length - 1]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.idx) > 1 || false;
    return (<div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <ThreadHeader_1.default members={(members === null || members === void 0 ? void 0 : members.map(m => m.key.toString())) || []}/>
      <div className='px-3 py-2 flex-grow overflow-y-auto flex flex-col flex-col-reverse space-y-2 space-y-reverse justify-start flex-col-reverse'>
        {messages === null || messages === void 0 ? void 0 : messages.map((message, index) => (<div key={index} className={`flex items-start space-x-3 ${message.message.owner.toString() === (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) && 'flex-row-reverse space-x-reverse'}`}>
            <outline_1.UserIcon className='w-7 h-7 bg-gray-200 dark:bg-gray-700 p-2 rounded-full'/>
            <div className={`flex flex-col ${message.message.owner.toString() === (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) && 'items-end'}`}>
              <div className='text-xs opacity-50'>{message.message.owner.toString() === (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) ? 'You' : (0, utils_1.display)(message.message.owner)}</div>
              <div className={`flex break-word space-x-2 items-center text-sm text-gray-800 dark:text-gray-200 ${message.message.owner.toString() === (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) ? 'text-right ml-8' : 'mr-8'}`}>
                {message.message.text}
              </div>
            </div>
          </div>))}
        {displayFetchDisclaimer && (<div className='w-full text-center italic text-xs opacity-70'>&mdash; Fetching older messages coming soon &mdash;</div>)}
      </div>
      <MessageInput_1.default text={text} setText={setText} onSubmit={onMessageSubmit} onEnterPress={onEnterPress} disabled={disabled}/>
    </div>);
}
exports.default = Thread;
