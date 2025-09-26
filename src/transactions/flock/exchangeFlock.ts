import { HDNodeWallet, Contract } from "ethers";
import { executeTx } from "../transaction.ts";
import { TxResult } from "../../types/txResult.ts";
import { sleep } from "../../utils/utils.ts";
import { CONTRACT_GMFLOCK_EXCHANGE } from "../../contracts/flock.ts";
import { CONTRACT_FLOCK } from "../../contracts/tokens.ts";

/**
 * Exchanges tokens for FLock and stakes them for one year.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {bigint} amount - Amount of tokens to exchange.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<TxResult>} - Transaction hash if sent.
 */
export async function exchangeFlock(wallet: HDNodeWallet, amount: bigint, dryRun: boolean = false): Promise<TxResult> {
  const contract = new Contract(CONTRACT_GMFLOCK_EXCHANGE.address, CONTRACT_GMFLOCK_EXCHANGE.abi, wallet);

  // await allowannce
  while (true) {
    const contractFlock = new Contract(CONTRACT_FLOCK.address, CONTRACT_FLOCK.abi, wallet);
    const allowance = await contractFlock.allowance(wallet.address, CONTRACT_GMFLOCK_EXCHANGE.address);
    if (allowance >= amount) break;
    await sleep(500);
  }

  // build transaction data
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
