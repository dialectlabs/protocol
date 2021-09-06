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
const swr_1 = __importDefault(require("swr"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const router_1 = require("next/router");
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const MessagePreview_1 = __importDefault(require("./MessagePreview"));
const api_1 = require("../../api");
function MessagesList() {
    var _a;
    const router = (0, router_1.useRouter)();
    const { threadId } = router.query;
    const { wallet } = (0, WalletContext_1.default)();
    const { connection, program } = (0, ApiContext_1.default)();
    const [publicKeys, setPublicKeys] = (0, react_1.useState)([]);
    const { data } = (0, swr_1.default)((wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) && connection && program ? [
        'settings',
        program,
        connection,
        wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString(),
    ] : null, api_1.settingsFetch, {
        refreshInterval: 500
    });
    (0, react_1.useEffect)(() => {
        if (data) {
            setPublicKeys(data.settings.threads.map(thread => thread.key.toString()));
        }
    }, [data]);
    const { data: threads } = (0, swr_1.default)(data && ((_a = data === null || data === void 0 ? void 0 : data.settings) === null || _a === void 0 ? void 0 : _a.threads.length) > 0 ? [
        '/threads',
        program,
        publicKeys
    ] : null, api_1.threadsFetch, {
        onError: (err) => {
            console.error('err', err);
        },
        refreshInterval: 500,
    });
    return (<div className='flex flex-col flex-grow overflow-y-auto'>
      {threads && threads.filter((thread) => thread !== undefined).map((thread, idx) => (<div key={idx} className={`flex flex-col justify-center px-3 py-2 h-20 border-b border-gray-200 dark:border-gray-800 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${thread && threadId === thread.publicKey.toString() && 'bg-gray-100 dark:bg-gray-800'}`} onClick={() => router.push(`/m/${thread === null || thread === void 0 ? void 0 : thread.publicKey.toString()}`)}>
          <MessagePreview_1.default thread={thread}/>
        </div>))}
    </div>);
}
exports.default = MessagesList;
