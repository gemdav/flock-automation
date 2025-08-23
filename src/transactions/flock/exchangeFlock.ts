import { HDNodeWallet, Contract } from "ethers";
import { executeTx } from "../transaction.ts";
import { CONTRACT_GMFLOCK_EXCHANGE } from "../../contracts/contracts.ts";

/**
 * Exchanges tokens for FLock and stakes them for one year.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {bigint} amount - Amount of tokens to exchange.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<string>} - Transaction hash if sent.
 */
export async function exchangeFlock(
  wallet: HDNodeWallet,
  amount: bigint,
  dryRun: boolean = false
): Promise<string> {
  const contract = new Contract(
    CONTRACT_GMFLOCK_EXCHANGE.address,
    CONTRACT_GMFLOCK_EXCHANGE.abi,
    wallet
  );

  const txDetails = {
    to: CONTRACT_GMFLOCK_EXCHANGE.address,
    data: contract.interface.encodeFunctionData("exchangeFlock", [
      amount,
      60 * 60 * 24 * 365, // 1 year in seconds
      wallet.address,
    ]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
