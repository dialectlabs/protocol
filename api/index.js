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
Object.defineProperty(exports, "__esModule", { value: true });
exports.newGroupMutate = exports.messagesGet = exports.messagesFetch = exports.messageCreate = exports.messageMutate = exports.messageProgramAddressGet = exports.addUserToThread = exports.userThreadMutate = exports.threadsGet = exports.threadsFetch = exports.threadGet = exports.threadFetch = exports.threadCreate = exports.threadMutate = exports.settingsMutate = exports.settingsCreate = exports.settingsFetch = exports.settingsGet = exports.validMemberFetch = exports.ownerFetcher = exports.accountInfoFetch = exports.accountInfoGet = exports.accountDiscriminator = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const js_sha256_1 = require("js-sha256");
const utils_1 = require("../utils");
// TODO: Ported from anchor. Use there.
// Calculates unique 8 byte discriminator prepended to all anchor state accounts.
// Calculates unique 8 byte discriminator prepended to all anchor accounts.
async function accountDiscriminator(name) {
    return Buffer.from(js_sha256_1.sha256.digest(`account:${name}`)).slice(0, 8);
}
exports.accountDiscriminator = accountDiscriminator;
// export async function decode<T = unknown>(accountName: string, ix: Buffer): Promise<T> {
//   // Chop off the discriminator before decoding.
//   const data = ix.slice(8);
//   const layout = this.accountLayouts.get(accountName);
//   return layout.decode(data);
// }
// export async function stateDiscriminator(name: string): Promise<Buffer> {
//   const ns = anchor.utils.features.isSet('anchor-deprecated-state') ? 'account' : 'state';
//   return Buffer.from(sha256.digest(`${ns}:${name}`)).slice(0, 8);
// }
async function accountInfoGet(connection, publicKey) {
    return await connection.getAccountInfo(publicKey);
}
exports.accountInfoGet = accountInfoGet;
async function accountInfoFetch(_url, connection, publicKeyStr) {
    const publicKey = new anchor.web3.PublicKey(publicKeyStr);
    return await accountInfoGet(connection, publicKey);
}
exports.accountInfoFetch = accountInfoFetch;
async function ownerFetcher(_url, wallet, connection) {
    return await accountInfoGet(connection, wallet.publicKey);
}
exports.ownerFetcher = ownerFetcher;
async function validMemberFetch(_url, program, publicKeyStr) {
    const publicKey = new anchor.web3.PublicKey(publicKeyStr);
    let accountInfo = null;
    // try {
    accountInfo = await program.provider.connection.getAccountInfo(publicKey);
    if (!accountInfo) {
        throw new Error('Account not found');
    }
    const [settingsAccount,] = await settingsProgramAddressGet(program, publicKey);
    const settingsAccountInfo = await program.provider.connection.getAccountInfo(settingsAccount);
    if (!settingsAccountInfo) {
        throw new Error('Account has not signed up');
    }
    return accountInfo;
}
exports.validMemberFetch = validMemberFetch;
/*
Settings
*/
async function settingsProgramAddressGet(program, publicKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        publicKey.toBuffer(),
        Buffer.from('settings_account'),
    ], program.programId);
}
async function settingsGet(program, connection, publicKey) {
    const [settingspk,] = await settingsProgramAddressGet(program, publicKey);
    const data = await program.account.settingsAccount.fetch(settingspk);
    const account = await connection.getAccountInfo(settingspk);
    return {
        ...account,
        publicKey: settingspk,
        settings: data
    };
}
exports.settingsGet = settingsGet;
async function settingsFetch(_url, program, connection, publicKey) {
    if (typeof publicKey === 'string') {
        publicKey = new anchor.web3.PublicKey(publicKey);
    }
    return await settingsGet(program, connection, publicKey);
}
exports.settingsFetch = settingsFetch;
async function settingsCreate(wallet, program, owner, signers, instructions) {
    const [publicKey, nonce] = await settingsProgramAddressGet(program, owner || wallet.publicKey);
    const tx = await program.rpc.createUserSettingsAccount(new anchor.BN(nonce), {
        accounts: {
            owner: owner || program.provider.wallet.publicKey,
            settingsAccount: publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers,
        instructions,
    });
    try {
        await waitForFinality(program, tx);
    }
    catch (e) {
        console.error(e);
        throw e;
    }
    return await settingsGet(program, program.provider.connection, owner || wallet.publicKey);
}
exports.settingsCreate = settingsCreate;
async function settingsMutate(_url, wallet, program) {
    return await settingsCreate(wallet, program);
}
exports.settingsMutate = settingsMutate;
async function threadMutate(_url, program, wallet) {
    return await threadCreate(program, wallet);
}
exports.threadMutate = threadMutate;
async function threadCreate(program, wallet) {
    const kp = anchor.web3.Keypair.generate();
    const [settingspk, nonce] = await settingsProgramAddressGet(program, wallet.publicKey);
    const tx = await program.rpc.createThreadAccount(new anchor.BN(nonce), {
        accounts: {
            owner: program.provider.wallet.publicKey,
            threadAccount: kp.publicKey,
            settingsAccount: settingspk,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [kp],
        instructions: [await program.account.threadAccount.createInstruction(kp, 512)],
    });
    await waitForFinality(program, tx);
    return await threadGet(program, kp.publicKey);
}
exports.threadCreate = threadCreate;
async function threadFetch(_url, program, publicKey) {
    if (typeof publicKey === 'string') {
        publicKey = new anchor.web3.PublicKey(publicKey);
    }
    return await threadGet(program, publicKey);
}
exports.threadFetch = threadFetch;
async function threadGet(program, publicKey) {
    const data = await program.account.threadAccount.fetch(publicKey);
    const account = await program.provider.connection.getAccountInfo(publicKey);
    return { ...account, publicKey, thread: data };
}
exports.threadGet = threadGet;
async function threadsFetch(_url, program, publicKeys) {
    if (publicKeys.length < 1)
        return [];
    if (typeof publicKeys[0] === 'string') {
        publicKeys = publicKeys.map(publicKey => new anchor.web3.PublicKey(publicKey));
    }
    return await threadsGet(program, publicKeys);
}
exports.threadsFetch = threadsFetch;
async function threadsGet(program, publicKeys) {
    const accountInfos = await anchor.utils.rpc.getMultipleAccounts(program.provider.connection, publicKeys);
    const threads = (await Promise.all(accountInfos.map(async (accountInfo, idx) => {
        // TODO: Code block ported from anchor. Use there.
        if (accountInfo === null) {
            throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
        }
        const discriminator = await accountDiscriminator('ThreadAccount');
        if (discriminator.compare(accountInfo.account.data.slice(0, 8))) {
            throw new Error('Invalid account discriminator');
        }
        return { ...accountInfo.account, publicKey: publicKeys[idx], thread: program.account.threadAccount.coder.accounts.decode('ThreadAccount', accountInfo.account.data) };
    })));
    return threads;
}
exports.threadsGet = threadsGet;
async function userThreadMutate(_url, program, thread, invitee) {
    return await addUserToThread(program, thread, invitee);
}
exports.userThreadMutate = userThreadMutate;
async function addUserToThread(program, thread, invitee, signers, instructions) {
    const [publicKey, nonce] = await settingsProgramAddressGet(program, invitee);
    const tx = await program.rpc.addUserToThread(new anchor.BN(nonce), {
        accounts: {
            owner: program.provider.wallet.publicKey,
            invitee,
            threadAccount: thread,
            inviteeSettingsAccount: publicKey,
        },
        signers: signers || undefined,
        instructions: instructions || undefined,
    });
    await waitForFinality(program, tx);
    return await threadGet(program, thread);
}
exports.addUserToThread = addUserToThread;
async function messageProgramAddressGet(program, threadPubkey, messageIdx) {
    return await anchor.web3.PublicKey.findProgramAddress([
        threadPubkey.toBuffer(),
        Buffer.from('message_account'),
        Buffer.from(messageIdx),
    ], program.programId);
}
exports.messageProgramAddressGet = messageProgramAddressGet;
async function messageMutate(_url, program, thread, text, sender) {
    if (typeof thread === 'string') {
        thread = await threadGet(program, new anchor.web3.PublicKey(thread));
    }
    return await messageCreate(program, thread, text, sender);
}
exports.messageMutate = messageMutate;
async function messageCreate(program, thread, text, sender) {
    const [messagepk, nonce] = await messageProgramAddressGet(program, thread.publicKey, (thread.thread.messageIdx + 1).toString());
    const tx = await program.rpc.addMessageToThread(new anchor.BN(nonce), text, {
        accounts: {
            sender: (sender === null || sender === void 0 ? void 0 : sender.publicKey) || program.provider.wallet.publicKey,
            messageAccount: messagepk,
            threadAccount: thread.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [sender] || undefined,
    });
    await waitForFinality(program, tx);
    const updatedThread = await threadGet(program, thread.publicKey);
    return await messagesGet(program, updatedThread, 1);
}
exports.messageCreate = messageCreate;
async function messagesFetch(_url, program, thread, batchSize) {
    return await messagesGet(program, thread, batchSize);
}
exports.messagesFetch = messagesFetch;
async function messagesGet(program, thread, batchSize) {
    // TODO: Protect against invalid batch size
    if (!batchSize) {
        batchSize = 20;
    }
    const maxIdx = thread.thread.messageIdx;
    const minIdx = Math.max(maxIdx - batchSize, 1);
    const idxs = Array(maxIdx - minIdx + 1).fill(null).map((_, i) => minIdx + i);
    // TODO: Batch RPC calls
    const publicKeys = await Promise.all(idxs.map(async (idx) => {
        const [messagepk,] = await messageProgramAddressGet(program, thread.publicKey, idx.toString());
        return messagepk;
    }));
    const accountInfos = await anchor.utils.rpc.getMultipleAccounts(program.provider.connection, publicKeys);
    const messages = (await Promise.all(accountInfos.map(async (accountInfo, idx) => {
        // TODO: Code block ported from anchor. Use there.
        if (accountInfo === null) {
            throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
        }
        const discriminator = await accountDiscriminator('MessageAccount');
        if (discriminator.compare(accountInfo.account.data.slice(0, 8))) {
            throw new Error('Invalid account discriminator');
        }
        return { ...accountInfo.account, publicKey: publicKeys[idx], message: program.account.messageAccount.coder.accounts.decode('MessageAccount', accountInfo.account.data) };
    })));
    return messages.reverse();
}
exports.messagesGet = messagesGet;
async function newGroupMutate(_url, program, wallet, invitees, text) {
    if (typeof invitees[0] === 'string') {
        invitees = invitees.map(invitee => new anchor.web3.PublicKey(invitee));
    }
    let threadAccount = await threadCreate(program, wallet);
    invitees.forEach(async (invitee) => {
        threadAccount = await addUserToThread(program, threadAccount.publicKey, invitee);
    });
    await messageCreate(program, threadAccount, text);
    return await threadGet(program, threadAccount.publicKey);
}
exports.newGroupMutate = newGroupMutate;
/*
Transactions
*/
async function waitForFinality(program, transactionStr, finality = 'confirmed', maxRetries = 10, // try 10 times
sleepDuration = 500) {
    let transaction = null;
    for (let n = 0; n < maxRetries; n++) {
        transaction = await program.provider.connection.getTransaction(transactionStr, { commitment: finality });
        if (transaction) {
            break;
        }
        await (0, utils_1.sleep)(sleepDuration);
    }
    if (!transaction) {
        throw new Error('Transaction failed to finalize');
    }
    return transaction;
}
