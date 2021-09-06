"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const MessagesList_1 = __importDefault(require("./MessagesList"));
const MessagesListHeader_1 = __importDefault(require("./MessagesListHeader"));
const NoMessages_1 = __importDefault(require("./NoMessages"));
const NewMessage_1 = __importDefault(require("./NewMessage"));
const Thread_1 = __importDefault(require("./Thread"));
const router_1 = require("next/router");
function Messages() {
    const router = (0, router_1.useRouter)();
    const threadId = router.query.threadId;
    const isNew = router.pathname === '/m/new';
    return (<div className="card-gray w-full flex flex-1 rounded-md border dark:border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-400 overflow-y-scroll">
        <div className="w-1/3 flex flex-col border-r-2 dark:border-r dark:border-gray-600">
          <MessagesListHeader_1.default />
          <MessagesList_1.default />
        </div>
      <div className="w-2/3 flex">
        {isNew ? (<NewMessage_1.default />) : !threadId ? (<NoMessages_1.default />) : (<Thread_1.default />)}
      </div>
    </div>);
}
exports.default = Messages;
