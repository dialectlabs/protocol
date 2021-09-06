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
const chai_1 = __importDefault(require("chai"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const anchor = __importStar(require("@project-serum/anchor"));
const assert_1 = __importDefault(require("assert"));
const web3_js_1 = require("@solana/web3.js");
const api_1 = require("../api");
chai_1.default.use(chai_as_promised_1.default);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;
// let settingspk: anchor.web3.PublicKey;
let threadpk;
// new user
const newkp = anchor.web3.Keypair.generate(); // invitee
const transferTransaction = new web3_js_1.Transaction();
transferTransaction.add(web3_js_1.SystemProgram.transfer({
    fromPubkey: PROGRAM.provider.wallet.publicKey,
    toPubkey: newkp.publicKey,
    lamports: 1000000000
}));
describe('test settings', () => {
    it('creates a settings account for the user', async () => {
        const settingsAccount = await (0, api_1.settingsCreate)(PROGRAM.provider.wallet, PROGRAM);
        const gottenSettingsAccount = await (0, api_1.settingsGet)(PROGRAM, PROGRAM.provider.connection, PROGRAM.provider.wallet.publicKey);
        assert_1.default.ok(settingsAccount.settings.owner.toString() ===
            PROGRAM.provider.wallet.publicKey.toString());
        assert_1.default.ok(settingsAccount.settings.threads.length === 0);
        assert_1.default.ok(settingsAccount.publicKey.toString() == gottenSettingsAccount.publicKey.toString());
        assert_1.default.ok(settingsAccount.settings.threads.length === gottenSettingsAccount.settings.threads.length);
    });
    it('should fail to create a settings account a second time for the user', async () => {
        chai_1.default
            .expect((0, api_1.settingsCreate)(PROGRAM.provider.wallet, PROGRAM))
            .to.eventually.be.rejectedWith(Error);
    });
    it('should fail to create a settings account for the wrong user', async () => {
        const newkp = anchor.web3.Keypair.generate(); // new user
        chai_1.default.expect((0, api_1.settingsCreate)(PROGRAM.provider.wallet, PROGRAM, newkp.publicKey, [newkp], [await PROGRAM.account.settingsAccount.createInstruction(newkp)])).to.eventually.be.rejectedWith(Error); // 0x92 (A seeds constraint was violated)
    });
});
describe('test threads', () => {
    // TODO: Remove test dependence on previous tests
    it('creates a thread account for the user', async () => {
        await PROGRAM.provider.send(transferTransaction);
        const threadAccount = await (0, api_1.threadCreate)(PROGRAM, PROGRAM.provider.wallet);
        threadpk = threadAccount.publicKey;
        // TODO: check if invited users' settings accounts exist. if not, make them on their behalf
        const settingsAccount = await (0, api_1.settingsGet)(PROGRAM, PROGRAM.provider.connection, PROGRAM.provider.wallet.publicKey);
        assert_1.default.ok(settingsAccount.settings.threads.length === 1);
        assert_1.default.ok(settingsAccount.settings.threads[0].key.toString() === threadAccount.publicKey.toString());
        const gottenThreadAccount = await (0, api_1.threadGet)(PROGRAM, threadpk);
        assert_1.default.ok(threadAccount.thread.members.length === 1);
        assert_1.default.ok(threadAccount.thread.members[0].key.toString() === PROGRAM.provider.wallet.publicKey.toString());
        assert_1.default.ok(threadAccount.publicKey.toString() === gottenThreadAccount.publicKey.toString());
    });
    it('adds another user to the thread', async () => {
        // make settings account for new user first
        const settingsAccount = await (0, api_1.settingsCreate)(PROGRAM.provider.wallet, PROGRAM, newkp.publicKey, [newkp]);
        // thread owner invites new user to thread
        await (0, api_1.addUserToThread)(PROGRAM, threadpk, newkp.publicKey);
        // fetch user settings, confirm
        const gottenSettingsAccount = await (0, api_1.settingsGet)(PROGRAM, PROGRAM.provider.connection, newkp.publicKey);
        assert_1.default.ok(gottenSettingsAccount.settings.threads.length === 1);
        assert_1.default.ok(gottenSettingsAccount.settings.threads[0].key.toString() === threadpk.toString());
        const threadAccount = await (0, api_1.threadGet)(PROGRAM, threadpk);
        assert_1.default.ok(threadAccount.thread.members.length === 2);
        assert_1.default.ok(threadAccount.thread.members[1].key.toString() === newkp.publicKey.toString());
    });
});
describe('test messages', () => {
    it('sends a message from alice to bob', async () => {
        let threadAccount = await (0, api_1.threadGet)(PROGRAM, threadpk);
        const n = 5;
        for (let i = 0; i < n; i++) {
            const text = 'h'.repeat(i);
            await (0, api_1.messageCreate)(PROGRAM, threadAccount, text);
            threadAccount = await (0, api_1.threadGet)(PROGRAM, threadpk);
        }
        const messages = await (0, api_1.messagesGet)(PROGRAM, threadAccount, n);
        for (let i = 0; i < n; i++) {
            assert_1.default.ok(messages[i].message.text === 'h'.repeat(n - i - 1));
        }
    });
});
