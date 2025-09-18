import { HDNodeWallet, TransactionRequest } from "ethers";
import { TxResult } from "../types/txResult.ts";
import { log } from "../utils/logger.ts";
import { sleep } from "../utils/utils.ts";

const nonceCache = new Map<string, number>();

/**
 * Get the next transaction nonce for a wallet, cached per address.
 *
 * @param {HDNodeWallet} wallet - Wallet to query.
 * @returns {Promise<number>} - Next nonce for this wallet.
 */
async function getNextNonce(wallet: HDNodeWallet): Promise<number> {
  const address = wallet.address.toLowerCase();

  if (!nonceCache.has(address)) {
    const nonce = await wallet.provider!.getTransactionCount(address, "pending");
    nonceCache.set(address, nonce);
  } else {
    nonceCache.set(address, (nonceCache.get(address) ?? 0) + 1);
  }

  return nonceCache.get(address)!;
}

/**
 * Execute a transaction or perform a dry-run (estimate gas)
 *
 * @param {HDNodeWallet} wallet - Sending wallet
 * @param {object} txDetails - Transaction details (to, value, data)
 * @param {boolean} dryRun - If true, only estimate gas without sending
 * @returns {Promise<TxResult>} Transaction hash if sent, or gas estimate if dry-run
 */
export async function executeTx(
  wallet: HDNodeWallet,
  txDetails: TransactionRequest,
  dryRun: boolean
): Promise<TxResult> {
  // fetch the next nonce for this wallet and attach the nonce to the transaction
  const nonce = await getNextNonce(wallet);
  const txWithNonce: TransactionRequest = {
    ...txDetails,
    nonce,
  };

  if (dryRun) {
    const gasEstimate = await wallet.estimateGas(txWithNonce);
    return {
      message: `[DRY-RUN] Estimated gas: ${gasEstimate.toString()}`,
    };
  }

  try {
    const tx = await wallet.sendTransaction(txWithNonce);
    const receipt = await tx.wait();
    return { tx, receipt, message: tx.hash };
  } catch (e: any) {
    if (e.info?.error?.message.includes("over rate limit")) {
      // retry if failure is due to rate limiting
      log("Rate limit hit, retrying after 5s cooldown ...");
      await sleep(5000);
      return executeTx(wallet, txDetails, dryRun);
    }
    // throw all other errors
    throw e;
  }
}
