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
const outline_1 = require("@heroicons/react/outline");
const solid_1 = require("@heroicons/react/solid");
const swr_1 = __importDefault(require("swr"));
const react_1 = __importStar(require("react"));
const Page_1 = require("../Page");
const WalletAccount_1 = __importDefault(require("./WalletAccount"));
const ProfileAccount_1 = __importDefault(require("./ProfileAccount"));
const SettingsAccount_1 = __importDefault(require("./SettingsAccount"));
const WalletContext_1 = __importDefault(require("../../utils/WalletContext"));
const ApiContext_1 = __importDefault(require("../../utils/ApiContext"));
const api_1 = require("../../api");
const Badge_1 = __importDefault(require("../utils/Badge"));
const Button_1 = __importDefault(require("../Button"));
const CircleProgress_1 = __importDefault(require("../utils/CircleProgress"));
const router_1 = __importDefault(require("next/router"));
function SectionTitle({ title }) {
    return (<div className='align-left font-crimson text-3xl text-gray-800 dark:text-gray-200'>{title}</div>);
}
function Profile() {
    const { wallet } = (0, WalletContext_1.default)();
    const { program, connection } = (0, ApiContext_1.default)();
    const { data, error, mutate } = (0, swr_1.default)(wallet && program && connection ? ['/settings', program, connection, wallet.publicKey] : null, api_1.settingsFetch);
    const loading = (!data && !error);
    const settingsNeedsCreating = !loading && !data;
    const [isCreatingSettings, setIsCreatingSettings] = (0, react_1.useState)(false);
    const [justCreated, setJustCreated] = (0, react_1.useState)(false);
    // TODO: Mutate on success
    (0, swr_1.default)(isCreatingSettings ? ['/mutate/settings', wallet, program] : null, api_1.settingsMutate, {
        onSuccess: (data) => {
            setIsCreatingSettings(false);
            setJustCreated(true);
            mutate(data);
        },
        onError: (error) => {
            setIsCreatingSettings(false);
        },
    });
    const disabled = !settingsNeedsCreating || isCreatingSettings || loading;
    return (<Page_1.ProtectedPage title={'Profile'}>
      <div className='flex flex-col flex-grow'>
        <p className="text-gray-500 dark:text-gray-400 text-center">Manage your profile, message settings, etc.</p>
        <div className='h-12'/>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700'/>

        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 pt-4 pb-16 flex'>
          <div className='col-span-1'>
            <SectionTitle title='wallet'/>
            <p className='mt-1 text-sm italic'>Your wallet public key is your address for sending and receiving messages.</p>
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700'/>
          <div className='col-span-1 sm:col-span-2'>
            <WalletAccount_1.default />
          </div>
        </div>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700'/>

        <div className='grid grid-cols-1 sm:grid-cols-3 pt-4 pb-16 flex items-start'>
          <div className='col-span-1 '>
            <div className='flex items-center space-x-3'>
              <SectionTitle title='profile'/>
              <div><Badge_1.default color='gray'>coming soon</Badge_1.default></div>
            </div>
            <p className='mt-1 text-sm italic'>Solana name service handles, NFT avatars, etc.</p>
          </div>
          <div className='sm:hidden sm:col-span-2 mb-4 border-t border-gray-300 dark:border-gray-700'/>
          <div className='col-span-1 sm:col-span-2'>
            <ProfileAccount_1.default />
          </div>
        </div>

        <div className='hidden sm:block border-t border-gray-300 dark:border-gray-700'/>
        
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 pb-16 flex items-start'>
          <div className='col-span-1'>
            <div className='flex space-x-3 items-center'>
              <SectionTitle title='settings'/>
              {settingsNeedsCreating && (<div><Badge_1.default>needs creating</Badge_1.default></div>)}
            </div>
            <p className='mt-1 text-sm italic'>Your settings account stores information about your threads. You don&apos;t need to use this public key.</p>
          </div>
          <div className='sm:hidden mb-4 border-t border-gray-300 dark:border-gray-700'/>
          <div className='col-span-1 sm:col-span-2'>
            <SettingsAccount_1.default />
          </div>
        </div>
        <div className='flex justify-end'>
        {justCreated ? (<Button_1.default onClick={() => router_1.default.push('/')}>
            <>
              <div className='btn-txt'>Continue</div>
              <outline_1.ArrowNarrowRightIcon className='ml-2 w-5'/>
            </>
          </Button_1.default>) : settingsNeedsCreating ? (<Button_1.default disabled={disabled} onClick={() => setIsCreatingSettings(true)}>
            <>
              {!isCreatingSettings ? (<solid_1.PlusIcon className='-ml-1 mr-2 btn-txt h-4 w-4'/>) : (<CircleProgress_1.default className='mr-2'/>)}
              <div className='btn-txt'>{!isCreatingSettings ? 'Create Settings Account' : 'Creating...'}</div>
            </>
          </Button_1.default>) : (<div className='flex'>
            <Button_1.default secondary onClick={() => router_1.default.back()} className='rounded-r-none w-24'>
              {<div>Back</div>}
            </Button_1.default>
            <Button_1.default disabled={true} className='rounded-l-none border-l-2 w-24'>
              <>
                <outline_1.CheckIcon className='-ml-1 mr-1 btn-txt h-4 w-4'/>
                <div className='btn-txt'>Saved</div>
              </>
            </Button_1.default>
          </div>)}
        </div>
        
      </div>
    </Page_1.ProtectedPage>);
}
exports.default = Profile;
