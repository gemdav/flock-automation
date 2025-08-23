import { Contract, HDNodeWallet } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { executeTx } from "../transaction.ts";

/**
 * Calls the `delegate` function on a contract with a uint256 argument.
 *
 * @param {HDNodeWallet} wallet - Wallet used for signing / provider access.
 * @param {ContractConfig} contractConfig - Contract address, ABI, and decimals.
 * @param {bigint} amount - Amount to pass as the uint256 argument.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<string>} - Transaction hash if sent.
 */
export async function delegate(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig,
  amount: bigint,
  dryRun: boolean = false
): Promise<string> {
  const contract = new Contract(
    contractConfig.address,
    contractConfig.abi,
    wallet
  );

  // Encode function call
  const txDetails = {
    to: contractConfig.address,
    data: contract.interface.encodeFunctionData("delegate", [amount]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
