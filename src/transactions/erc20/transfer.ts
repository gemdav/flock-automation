import { HDNodeWallet, Contract, parseUnits } from "ethers";
import { executeTx } from "../transaction.ts";
import { ContractConfig } from "../../types/contractConfig.ts";
import { TxResult } from "../../types/txResult.ts";

/**
 * Transfers ERC-20 tokens using a contract config.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {ContractConfig} contractConfig - Token contract address, ABI, and decimals.
 * @param {string} to - Recipient address.
 * @param {bigint} amount - Amount of tokens to transfer.
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<TxResult>} - Transaction hash if sent.
 */
export async function transferERC20Token(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig,
  to: string,
  amount: bigint,
  dryRun: boolean = false
): Promise<TxResult> {
  // connect to ERC20 contract
  const contract = new Contract(contractConfig.address, contractConfig.abi, wallet);

  // build transaction data
  const txDetails = {
    to: contractConfig.address,
    data: contract.interface.encodeFunctionData("transfer", [to, amount]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
