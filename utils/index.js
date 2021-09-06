"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.Wallet_ = exports.getPublicKey = exports.display = void 0;
const Wallet_1 = __importDefault(require("./Wallet"));
const web3_js_1 = require("@solana/web3.js");
const display = (publicKey) => {
    const s = publicKey.toString();
    return `${s.slice(0, 4)}...${s.slice(s.length - 4)}`;
};
exports.display = display;
const getPublicKey = (wallet, abbreviate = false) => {
    var _a;
    if (!wallet || !wallet.connected)
        return null;
    const pubkeyStr = `${(_a = wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) === null || _a === void 0 ? void 0 : _a.toBase58()}`;
    if (!abbreviate)
        return pubkeyStr;
    return `${pubkeyStr === null || pubkeyStr === void 0 ? void 0 : pubkeyStr.slice(0, 4)}...${pubkeyStr === null || pubkeyStr === void 0 ? void 0 : pubkeyStr.slice((pubkeyStr === null || pubkeyStr === void 0 ? void 0 : pubkeyStr.length) - 4)}` || null;
};
exports.getPublicKey = getPublicKey;
class Wallet_ extends Wallet_1.default {
    // anchor needs a non-optional publicKey attribute, sollet says it's optional, so we need to fix it here.
    get publicKey() {
        const pkornull = super.publicKey;
        let pk;
        if (!pkornull) {
            const kp = web3_js_1.Keypair.generate();
            pk = kp.publicKey;
        }
        else {
            pk = pkornull;
        }
        return pk;
    }
}
exports.Wallet_ = Wallet_;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
