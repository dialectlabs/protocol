"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const utils_1 = require("../../utils");
const api_1 = require("../../api");
function MessagePreview({ thread }) {
    const { program } = (0, ApiContext_1.default)();
    const { wallet } = (0, WalletContext_1.default)();
    const { data: messages } = (0, swr_1.default)(thread ? ['/messages', program, thread, 1] : null, api_1.messagesFetch);
    const otherMembers = thread.thread.members.filter(member => member.key.toString() !== (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()));
    const otherMembersStrs = otherMembers.map(member => (0, utils_1.display)(member.key));
    const otherMembersStr = otherMembersStrs.join(', ');
    return (<div>
      {(thread === null || thread === void 0 ? void 0 : thread.thread.members.length) > 0 && (<div className='text-xs'>{thread === null || thread === void 0 ? void 0 : thread.thread.members.length} members</div>)}
      {otherMembers && otherMembers.length > 0 &&
            <div className='text-gray-800 dark:text-white'>{otherMembersStr}</div>}
      {messages && (messages === null || messages === void 0 ? void 0 : messages.length) > 0 && (<div className='text-sm text-gray-600 dark:text-gray-400 truncate overflow-ellipsis'><span className='opacity-50'>{messages[0].message.owner.toString() === (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey.toString()) ? 'You' : (0, utils_1.display)(messages[0].message.owner)}:</span>{' '}{messages[0].message.text}</div>)}
    </div>);
}
exports.default = MessagePreview;
