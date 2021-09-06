"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const api_1 = require("../../api");
const swr_1 = __importDefault(require("swr"));
const WalletAccount_1 = require("./WalletAccount");
function SettingsAccount() {
    const { wallet } = (0, WalletContext_1.default)();
    const { program, connection } = (0, ApiContext_1.default)();
    const { data } = (0, swr_1.default)(wallet && program && connection
        ? ['/settings', program, connection, wallet.publicKey]
        : null, api_1.settingsFetch);
    const balance = data && data.lamports !== null && data.lamports !== undefined ? data.lamports / 1e9 : undefined;
    return (<WalletAccount_1.WalletComponent publicKey={data === null || data === void 0 ? void 0 : data.publicKey.toString()} balance={balance}/>);
}
exports.default = SettingsAccount;
