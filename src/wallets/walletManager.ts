import { HDNodeWallet, JsonRpcProvider } from "ethers";
import { NETWORKS } from "../config/network.js";

/**
 * Create a wallet from a secret recovery phrase (SRP / mnemonic)
 * @param {string} srp - 12-word secret recovery phrase
 * @param {keyof typeof NETWORKS} [network='base'] - network to connect
 * @returns {HDNodeWallet} Connected Ethers.js wallet
 * @throws {Error} If the SRP is invalid or the network configuration is missing
 */
export function createWalletFromSRP(
  srp: string,
  network: keyof typeof NETWORKS = "base"
): HDNodeWallet {
  if (!NETWORKS[network]) {
    throw new Error(`Network '${network}' is not configured.`);
  }

  const wallet = HDNodeWallet.fromPhrase(srp);
  const rpcUrl = NETWORKS[network].rpcUrl;

  if (!rpcUrl) {
    throw new Error(`RPC URL for network '${network}' is missing.`);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  return wallet.connect(provider);
}
