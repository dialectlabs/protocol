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
const react_1 = __importStar(require("react"));
const react_2 = require("@headlessui/react");
const Button_1 = require("../Button");
function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}
function Menu({ button, items, className = '', }) {
    return (<react_2.Menu as="div" className="relative">
      {({ open }) => (<>
          <div>
            <react_2.Menu.Button className={`${Button_1.BUTTON_STYLES} ${className}`}>
              {button}
            </react_2.Menu.Button>
          </div>
          <react_2.Transition show={open} as={react_1.Fragment} enter="transition ease-out duration-200" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
            <react_2.Menu.Items static className="z-10 card-white flex flex-col origin-top-right absolute right-0 mt-2 w-60 shadow-lg py-1 focus:outline-none">
              {items.map((item) => (<react_2.Menu.Item key={item.name}>
                  {({ active }) => (<button disabled={item.disabled} onClick={item.onClick} className={classNames(active && !item.disabled
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'cursor-default', `flex flex-grow space-x-2 items-center block text-sm ${!item.disabled ? 'text-gray-800' : 'text-gray-400'} ${!item.disabled
                        ? 'dark:text-gray-300'
                        : 'dark:text-gray-500'} dark:bg-gray-900`)}>
                      {item.itemChildren}
                    </button>)}
                </react_2.Menu.Item>))}
            </react_2.Menu.Items>
          </react_2.Transition>
        </>)}
    </react_2.Menu>);
}
exports.default = Menu;
