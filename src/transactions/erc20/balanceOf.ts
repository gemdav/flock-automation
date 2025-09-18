import { HDNodeWallet, Contract, ContractMethodArgs } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { ERC20_ABI } from "../../contracts/constants.ts";
import { sleep } from "../../utils/utils.ts";

/**
 * Gets the ERC-20 token balance of the wallet.
 *
 * @param {HDNodeWallet} wallet - Wallet to query.
 * @param {ContractConfig} contractConfig - Token contract address, ABI, and decimals.
 * @param {number | bigint} blockNumber - Optional block number to query the balance at.
 * @returns {Promise<string>} - Formatted token balance.
 */
export async function balanceOf(
  wallet: HDNodeWallet,
  contractConfig: ContractConfig,
  blockNumber?: number | bigint
): Promise<bigint> {
  const contract = new Contract(contractConfig.address, ERC20_ABI, wallet);

  // check if block is known to RPC provider, wait otherwise
  if (blockNumber) {
    while (blockNumber > (await wallet.provider!.getBlockNumber())) {
      await sleep(500);
    }
  }

  const balance = await contract.balanceOf(wallet.address, {
    blockTag: blockNumber,
  });
  return balance;
}
