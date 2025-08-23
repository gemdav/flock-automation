import { Contract, HDNodeWallet } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { executeTx } from "../transaction.ts";

/**
 * Approves a spender to spend tokens on behalf of the wallet.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {ContractConfig} contractConfig - Token contract address, ABI, and decimals.
 * @param {string} spender - Address allowed to spend tokens.
 * @param {bigint} amount - Amount of tokens to approve.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<string>} - Transaction hash if sent.
 */
export async function approve(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig,
  spender: string,
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
    data: contract.interface.encodeFunctionData("approve", [spender, amount]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
