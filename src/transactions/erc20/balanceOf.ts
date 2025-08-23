import { HDNodeWallet, Contract } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { ERC20_ABI } from "../../contracts/constants.ts";

/**
 * Gets the ERC-20 token balance of the wallet.
 *
 * @param {HDNodeWallet} wallet - Wallet to query.
 * @param {ContractConfig} contractConfig - Token contract address, ABI, and decimals.
 * @returns {Promise<string>} - Formatted token balance.
 */
export async function balanceOf(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig
): Promise<bigint> {
  const contract = new Contract(contractConfig.address, ERC20_ABI, wallet);

  const balance = await contract.balanceOf(wallet.address);
  return balance;
}
