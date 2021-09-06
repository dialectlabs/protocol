"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Page_1 = require("../../components/Page");
const Messages_1 = __importDefault(require("../../components/Messages"));
function ThreadKey() {
    return (<Page_1.ProtectedPage>
      <Messages_1.default />
    </Page_1.ProtectedPage>);
}
exports.default = ThreadKey;
