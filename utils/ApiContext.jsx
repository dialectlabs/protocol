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
exports.ApiContextProvider = exports.ApiContext = void 0;
const react_1 = __importStar(require("react"));
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@project-serum/anchor"));
const WalletContext_1 = __importDefault(require("./WalletContext"));
const dialect_json_1 = __importDefault(require("./dialect.json"));
const programs_json_1 = __importDefault(require("./programs.json"));
exports.ApiContext = (0, react_1.createContext)({
    connection: null,
    program: null,
});
const ApiContextProvider = (props) => {
    const { wallet, networkName } = (0, WalletContext_1.default)();
    const [connection, setConnection] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (networkName) {
            setConnection(new web3_js_1.Connection(programs_json_1.default[networkName].clusterAddress, 'recent'));
        }
    }, [networkName]);
    const [program, setProgram] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if ((wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) && connection && networkName) {
            anchor.setProvider(new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions()));
            const program = new anchor.Program(dialect_json_1.default, new anchor.web3.PublicKey(programs_json_1.default[networkName].programAddress));
            setProgram(program);
        }
    }, [wallet === null || wallet === void 0 ? void 0 : wallet.publicKey, networkName, connection]);
    return (<exports.ApiContext.Provider value={{
            connection: connection,
            program: program,
        }}>
      {props.children}
    </exports.ApiContext.Provider>);
};
exports.ApiContextProvider = ApiContextProvider;
function useApi() {
    return (0, react_1.useContext)(exports.ApiContext);
}
exports.default = useApi;
