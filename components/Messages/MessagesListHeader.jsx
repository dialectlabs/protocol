"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const outline_1 = require("@heroicons/react/outline");
const router_1 = require("next/router");
function Messages() {
    const router = (0, router_1.useRouter)();
    return (<div className='p-4 border-b border-gray-200 dark:border-gray-800'>
      <div className='flex justify-end'>
        <button className='p-2 rounded-full border border-gray-50 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500' onClick={() => router.push('/m/new')}>
          <outline_1.PencilAltIcon className='w-5 h-5'/>
        </button>
      </div>
    </div>);
}
exports.default = Messages;
