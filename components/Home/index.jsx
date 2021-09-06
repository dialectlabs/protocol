"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const Page_1 = require("../Page");
const Messages_1 = __importDefault(require("../Messages"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const api_1 = require("../../api");
const router_1 = require("next/router");
function Home() {
    const router = (0, router_1.useRouter)();
    const { wallet } = (0, WalletContext_1.default)();
    const { program, connection } = (0, ApiContext_1.default)();
    const { data, error } = (0, swr_1.default)(wallet && program && connection ? ['/settings', program, connection, wallet.publicKey] : null, api_1.settingsFetch);
    const loading = !data && !error;
    if (error) {
        router.push('/profile');
    }
    if (loading) {
        return <div />;
    }
    return (<Page_1.ProtectedPage>
      <Messages_1.default />
    </Page_1.ProtectedPage>);
}
exports.default = Home;
