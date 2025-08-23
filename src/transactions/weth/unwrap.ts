import { Contract, HDNodeWallet, TransactionRequest } from "ethers";
import { CONTRACT_WETH } from "../../contracts/contracts.ts";
import { executeTx } from "../transaction.ts";

/**
 * Unwraps all WETH for a given wallet into native ETH using Uniswap V3 Router.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {bigint} amount - The WETH amount to unwrap.
 * @param {number} [slippageBps=100] - Minimum acceptable amount out in basis points (default 0.5%).
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<string>} - Transaction hash if sent.
 */
export async function unwrap(
  wallet: HDNodeWallet,
  amount: bigint,
  dryRun: boolean = false
): Promise<string> {
  const contract = new Contract(
    CONTRACT_WETH.address,
    CONTRACT_WETH.abi,
    wallet
  );

  // Build params for Uniswap V3 router
  const txDetails: TransactionRequest = {
    to: CONTRACT_WETH.address,
    from: wallet.address,
    data: contract.interface.encodeFunctionData("withdraw", [amount]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
