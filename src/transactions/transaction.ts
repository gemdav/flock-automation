import { HDNodeWallet, TransactionRequest } from "ethers";

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
    const nonce = await wallet.provider!.getTransactionCount(
      address,
      "pending"
    );
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
 * @returns {Promise<string>} Transaction hash if sent, or gas estimate if dry-run
 */
export async function executeTx(
  wallet: HDNodeWallet,
  txDetails: TransactionRequest,
  dryRun: boolean
): Promise<string> {
  // Fetch the next nonce for this wallet and attach the nonce to the transaction
  const nonce = await getNextNonce(wallet);
  const txWithNonce: TransactionRequest = {
    ...txDetails,
    nonce,
  };

  if (dryRun) {
    const gasEstimate = await wallet.estimateGas(txWithNonce);
    return `[DRY-RUN] Estimated gas: ${gasEstimate.toString()}`;
  }

  console.log(nonce);
  console.log(txWithNonce);

  const tx = await wallet.sendTransaction(txWithNonce);
  await tx.wait();
  return tx.hash;
}
