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
const document_1 = __importStar(require("next/document"));
const React = __importStar(require("react"));
class MyDocument extends document_1.default {
    static async getInitialProps(ctx) {
        const initialProps = await document_1.default.getInitialProps(ctx);
        return { ...initialProps };
    }
    render() {
        return (<document_1.Html>
        <document_1.Head>
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin={'true'}/>
          <link href="https://fonts.googleapis.com/css2?family=Crimson+Text&display=swap" rel="stylesheet"/>
        </document_1.Head>
        <body className='dark:bg-black'>
          <document_1.Main />
          <document_1.NextScript />
        </body>
      </document_1.Html>);
    }
}
exports.default = MyDocument;
