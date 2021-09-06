"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_STYLES_SECONDARY = exports.BUTTON_STYLES = void 0;
const react_1 = __importDefault(require("react"));
exports.BUTTON_STYLES = 'relative inline-flex items-center border-white dark:border-black px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white dark:text-white bg-red-700 dark:bg-red-600 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-700 dark:text-gray-300 disabled:bg-red-300 dark:disabled:opacity-70 disabled:cursor-not-allowed';
exports.BUTTON_STYLES_SECONDARY = 'px-4 py-2 text-sm rounded-lg border border-gray-400 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
function Button({ className = '', onClick, children, disabled, secondary, }) {
    return (<button type="button" className={`${secondary ? exports.BUTTON_STYLES_SECONDARY : exports.BUTTON_STYLES} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>);
}
exports.default = Button;
