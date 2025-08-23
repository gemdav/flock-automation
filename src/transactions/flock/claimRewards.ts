import { Contract, HDNodeWallet } from "ethers";
import { executeTx } from "../transaction.ts";
import { ContractConfig } from "../../types/contractConfig.ts";

/**
 * Claims rewards from the specified contract.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {ContractConfig} contractConfig - Contract address and ABI.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<string>} - Transaction hash if sent.
 */
export async function claimRewards(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig,
  dryRun: boolean = false
): Promise<string> {
  const contract = new Contract(
    contractConfig.address,
    contractConfig.abi,
    wallet
  );

  const txDetails = {
    to: contractConfig.address,
    data: contract.interface.encodeFunctionData("claimRewards", []),
  };

  return executeTx(wallet, txDetails, dryRun);
}
