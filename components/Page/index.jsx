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
exports.ProtectedPage = void 0;
const head_1 = __importDefault(require("next/head"));
const router_1 = require("next/router");
const react_1 = __importStar(require("react"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
function ProtectedPage(props) {
    const router = (0, router_1.useRouter)();
    const { wallet } = (0, WalletContext_1.default)();
    (0, react_1.useEffect)(() => {
        if (!router)
            return;
        if (!(wallet === null || wallet === void 0 ? void 0 : wallet.connected)) {
            router.push('/');
        }
    }, [router, wallet]);
    if (!router || !(wallet === null || wallet === void 0 ? void 0 : wallet.publicKey)) {
        return <div />;
    }
    return <Page {...props}/>;
}
exports.ProtectedPage = ProtectedPage;
function Page({ title, children }) {
    return (<>
      <head_1.default>
        <title>dialect | {title || 'Home'}</title>
        <link rel="icon" href="/favicon.ico"/>
        <meta property="og:title" content={'dialect'} key="ogtitle"/>
        <meta property="og:description" content={'On-chain Solana messaging protocol.'} key="ogdesc"/>
        <meta property="og:url" content={'dialect.to'} key="ogurl"/>
        
        <meta name="twitter:card" content="summary_large_image"/>
        <meta property="og:image" content={'https://dialect-public.s3.us-west-2.amazonaws.com/dialect.png'}/>
      </head_1.default>
      {title && (<div className="mt-6 md:mt-6 text-center">
          <h2>{title}</h2>
        </div>)}
      {children}
    </>);
}
exports.default = Page;
