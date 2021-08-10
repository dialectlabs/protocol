import Wallet from '@project-serum/sol-wallet-adapter';

export type ProviderPropsType = {
  children: JSX.Element;
};

export const getPublicKey = (wallet: Wallet | null | undefined, abbreviate = false): string | null => {
  if (!wallet || !wallet.connected) return null;

  const pubkeyStr = `${wallet?.publicKey?.toBase58()}`;
  if (!abbreviate) return pubkeyStr;

  return `${pubkeyStr?.slice(0, 4)}...${pubkeyStr?.slice(pubkeyStr?.length - 4)}` || null;
};