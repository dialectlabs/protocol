"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Landing_1 = __importDefault(require("../components/Landing"));
const Home_1 = __importDefault(require("../components/Home"));
const WalletContext_1 = __importDefault(require("../utils/WalletContext"));
function Index() {
    const { wallet } = (0, WalletContext_1.default)();
    return <>{wallet && wallet.connected ? <Home_1.default /> : <Landing_1.default />}</>;
}
exports.default = Index;
