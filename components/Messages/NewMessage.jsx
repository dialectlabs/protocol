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
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const api_1 = require("../../api");
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const router_1 = __importDefault(require("next/router"));
const ThreadHeader_1 = __importDefault(require("./ThreadHeader"));
const MessageInput_1 = __importDefault(require("./MessageInput"));
let timeout;
function NewMessage() {
    var _a;
    const { program } = (0, ApiContext_1.default)();
    const { wallet } = (0, WalletContext_1.default)();
    const [members, setMembers] = (0, react_1.useState)([]);
    const [status, setStatus] = (0, react_1.useState)(null);
    const [input, setInput] = (0, react_1.useState)('');
    const [text, setText] = (0, react_1.useState)('');
    const [creating, setCreating] = (0, react_1.useState)(false);
    const myPublicKeyStr = (_a = wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) === null || _a === void 0 ? void 0 : _a.toString();
    (0, react_1.useEffect)(() => {
        if (wallet && members.length < 1) {
            members.push(wallet.publicKey.toString());
            setMembers([...members]);
        }
    }, [wallet]);
    (0, swr_1.default)(status === 'fetching' ? ['/member', program, input] : null, api_1.validMemberFetch, {
        onSuccess: () => {
            setStatus('valid');
        },
        onError: (e) => {
            switch (e.message) {
                case 'Account has not signed up':
                    setStatus('noAccount');
                    break;
                default:
                    setStatus('invalid');
                    break;
            }
        },
    });
    (0, react_1.useEffect)(() => {
        if (timeout)
            clearTimeout(timeout);
        setStatus(null);
        timeout = setTimeout(() => {
            if (input === '') {
                setStatus(null);
            }
            else if (input === myPublicKeyStr || members.includes(input)) {
                setStatus('duplicate');
            }
            else {
                setStatus('fetching');
            }
        }, 750);
    }, [input]);
    const onSubmit = (event) => {
        event.preventDefault();
        if (status !== 'valid')
            return;
        members.push(input);
        setMembers([...members]);
        setInput('');
    };
    const onMemberDelete = (idx) => {
        members.splice(idx, 1);
        setMembers([...members]);
    };
    const onMessageSubmit = (event) => {
        event.preventDefault();
        setCreating(true);
    };
    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            setCreating(true);
        }
    };
    const { data: thread } = (0, swr_1.default)(creating ? [
        '/m/new',
        program,
        wallet,
        members.filter(m => m !== (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString())),
        text
    ] : null, api_1.newGroupMutate, {
        onSuccess: (data) => {
            setCreating(false);
            router_1.default.push(`/m/${data.publicKey.toString()}`);
        },
    });
    const disabled = text.length <= 0 || text.length > 280 || creating || thread !== undefined;
    return (<div className='flex flex-col space-y-2 justify-between text-left w-full'>
      <ThreadHeader_1.default members={members} editing input={input} setInput={setInput} onInputSubmit={onSubmit} status={status} onMemberDelete={onMemberDelete}/>
      <MessageInput_1.default text={text} setText={setText} onSubmit={onMessageSubmit} onEnterPress={onEnterPress} disabled={disabled}/>
    </div>);
}
exports.default = NewMessage;
