"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// TDOO: Ported from github.com/project-serum/sol-wallet-adapter. Use that as a dep instead.
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
class Wallet extends eventemitter3_1.default {
    constructor(provider, _network) {
        super();
        this._network = _network;
        this._publicKey = null;
        this._popup = null;
        this._handlerAdded = false;
        this._nextRequestId = 1;
        this._autoApprove = false;
        this._responsePromises = new Map();
        this.handleMessage = (e) => {
            var _a;
            if ((this._injectedProvider && e.source === window) ||
                (e.origin === ((_a = this._providerUrl) === null || _a === void 0 ? void 0 : _a.origin) && e.source === this._popup)) {
                if (e.data.method === 'connected') {
                    const newPublicKey = new web3_js_1.PublicKey(e.data.params.publicKey);
                    if (!this._publicKey || !this._publicKey.equals(newPublicKey)) {
                        if (this._publicKey && !this._publicKey.equals(newPublicKey)) {
                            this.handleDisconnect();
                        }
                        this._publicKey = newPublicKey;
                        this._autoApprove = !!e.data.params.autoApprove;
                        this.emit('connect', this._publicKey);
                    }
                }
                else if (e.data.method === 'disconnected') {
                    this.handleDisconnect();
                }
                else if (e.data.result || e.data.error) {
                    const promises = this._responsePromises.get(e.data.id);
                    if (promises) {
                        const [resolve, reject] = promises;
                        if (e.data.result) {
                            resolve(e.data.result);
                        }
                        else {
                            reject(new Error(e.data.error));
                        }
                    }
                }
            }
        };
        this._beforeUnload = () => {
            void this.disconnect();
        };
        if (isInjectedProvider(provider)) {
            this._injectedProvider = provider;
        }
        else if (isString(provider)) {
            this._providerUrl = new URL(provider);
            this._providerUrl.hash = new URLSearchParams({
                origin: window.location.origin,
                network: this._network,
            }).toString();
        }
        else {
            throw new Error('provider parameter must be an injected provider or a URL string.');
        }
    }
    handleConnect() {
        var _a;
        if (!this._handlerAdded) {
            this._handlerAdded = true;
            window.addEventListener('message', this.handleMessage);
            window.addEventListener('beforeunload', this._beforeUnload);
        }
        if (this._injectedProvider) {
            return new Promise((resolve) => {
                void this.sendRequest('connect', {});
                resolve();
            });
        }
        else {
            window.name = 'parent';
            this._popup = window.open((_a = this._providerUrl) === null || _a === void 0 ? void 0 : _a.toString(), '_blank', 'location,resizable,width=460,height=675');
            return new Promise((resolve) => {
                this.once('connect', resolve);
            });
        }
    }
    handleDisconnect() {
        if (this._handlerAdded) {
            this._handlerAdded = false;
            window.removeEventListener('message', this.handleMessage);
            window.removeEventListener('beforeunload', this._beforeUnload);
        }
        if (this._publicKey) {
            this._publicKey = null;
            this.emit('disconnect');
        }
        this._responsePromises.forEach(([, reject], id) => {
            this._responsePromises.delete(id);
            reject(new Error('Wallet disconnected'));
        });
    }
    async sendRequest(method, params) {
        if (method !== 'connect' && !this.connected) {
            throw new Error('Wallet not connected');
        }
        const requestId = this._nextRequestId;
        ++this._nextRequestId;
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d;
            this._responsePromises.set(requestId, [resolve, reject]);
            if (this._injectedProvider) {
                this._injectedProvider.postMessage({
                    jsonrpc: '2.0',
                    id: requestId,
                    method,
                    params: {
                        network: this._network,
                        ...params,
                    },
                });
            }
            else {
                (_a = this._popup) === null || _a === void 0 ? void 0 : _a.postMessage({
                    jsonrpc: '2.0',
                    id: requestId,
                    method,
                    params,
                }, (_c = (_b = this._providerUrl) === null || _b === void 0 ? void 0 : _b.origin) !== null && _c !== void 0 ? _c : '');
                if (!this.autoApprove) {
                    (_d = this._popup) === null || _d === void 0 ? void 0 : _d.focus();
                }
            }
        });
    }
    get publicKey() {
        return this._publicKey;
    }
    get connected() {
        return this._publicKey !== null;
    }
    get autoApprove() {
        return this._autoApprove;
    }
    async connect() {
        if (this._popup) {
            this._popup.close();
        }
        await this.handleConnect();
    }
    async disconnect() {
        if (this._injectedProvider) {
            await this.sendRequest('disconnect', {});
        }
        if (this._popup) {
            this._popup.close();
        }
        this.handleDisconnect();
    }
    async sign(data, display) {
        if (!(data instanceof Uint8Array)) {
            throw new Error('Data must be an instance of Uint8Array');
        }
        const response = (await this.sendRequest('sign', {
            data,
            display,
        }));
        const signature = bs58_1.default.decode(response.signature);
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        return {
            signature,
            publicKey,
        };
    }
    async signTransaction(transaction) {
        const response = (await this.sendRequest('signTransaction', {
            message: bs58_1.default.encode(transaction.serializeMessage()),
        }));
        const signature = bs58_1.default.decode(response.signature);
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        transaction.addSignature(publicKey, signature);
        return transaction;
    }
    async signAllTransactions(transactions) {
        const response = (await this.sendRequest('signAllTransactions', {
            messages: transactions.map((tx) => bs58_1.default.encode(tx.serializeMessage())),
        }));
        const signatures = response.signatures.map((s) => bs58_1.default.decode(s));
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        transactions = transactions.map((tx, idx) => {
            tx.addSignature(publicKey, signatures[idx]);
            return tx;
        });
        return transactions;
    }
}
exports.default = Wallet;
function isString(a) {
    return typeof a === 'string';
}
function isInjectedProvider(a) {
    return (isObject(a) && 'postMessage' in a && typeof a.postMessage === 'function');
}
function isObject(a) {
    return typeof a === 'object' && a !== null;
}
