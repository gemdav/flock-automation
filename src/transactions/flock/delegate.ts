import { Contract, HDNodeWallet } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { executeTx } from "../transaction.ts";
import { TxResult } from "../../types/txResult.ts";
import { sleep } from "../../utils/utils.ts";

/**
 * Calls the `delegate` function on a contract with a uint256 argument.
 *
 * @param {HDNodeWallet} wallet - Wallet used for signing / provider access.
 * @param {ContractConfig} delegationContract - The contract to delegate on.
 * @param {ContractConfig} tokenContract - The token to delegate (for allowance check).
 * @param {bigint} amount - Amount to pass as the uint256 argument.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<TxResult>} - Transaction hash if sent.
 */
export async function delegate(
  wallet: HDNodeWallet,
  delegationContract: ContractConfig,
  tokenContract: ContractConfig,
  amount: bigint,
  dryRun: boolean = false
): Promise<TxResult> {
  const contract = new Contract(delegationContract.address, delegationContract.abi, wallet);

  // await allowannce
  while (true) {
    const contractToken = new Contract(tokenContract.address, tokenContract.abi, wallet);
    const allowance = await contractToken.allowance(wallet.address, delegationContract.address);
    if (allowance >= amount) break;
    await sleep(500);
  }

  // build transaction data
  const txDetails = {
    to: delegationContract.address,
    data: contract.interface.encodeFunctionData("delegate", [amount]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
