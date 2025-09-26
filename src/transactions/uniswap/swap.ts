import { HDNodeWallet, Contract, parseUnits, TransactionRequest } from "ethers";
import { executeTx } from "../transaction.ts";
import { ContractConfig } from "../../types/contractConfig.ts";
import { UniswapQuote } from "../../types/uniswapQuote.ts";
import { TxResult } from "../../types/txResult.ts";
import { sleep } from "../../utils/utils.ts";
import { CONTRACT_UNISWAP_V3_ROUTER } from "../../contracts/uniswap.ts";

/**
 * Swaps `amountIn` of `tokenIn` for `tokenOut` using Uniswap V3.
 *
 * @param {HDNodeWallet} wallet - Wallet to sign the transaction.
 * @param {string} tokenIn - Address of input token.
 * @param {string} tokenOut - Address of output token.
 * @param {UniswapQuote} quote - Quote object containing fee and rate for the swap.
 * @param {bigint} amountIn - Amount of input token to swap.
 * @param {number} [slippageBps=50] - Allowed slippage in basis points (50 = 0.5%).
 * @param {boolean} [dryRun=false] - If true, returns gas estimate without sending.
 * @returns {Promise<TxResult>} - Transaction hash if sent.
 */
export async function swapExactInputSingle(
  wallet: HDNodeWallet,
  tokenIn: ContractConfig,
  tokenOut: ContractConfig,
  quote: UniswapQuote,
  amountIn: bigint,
  slippageBps: number = 50,
  dryRun: boolean = false
): Promise<TxResult> {
  const router = new Contract(CONTRACT_UNISWAP_V3_ROUTER.address, CONTRACT_UNISWAP_V3_ROUTER.abi, wallet);

  // await allowannce
  while (true) {
    const contractTokenIn = new Contract(tokenIn.address, tokenIn.abi, wallet);
    const allowance = await contractTokenIn.allowance(wallet.address, CONTRACT_UNISWAP_V3_ROUTER.address);
    if (allowance >= amountIn) break;
    await sleep(500);
  }

  // set minimum amount out based on slippage
  const amountOutMinimum = (quote.amountOut * (10_000n - BigInt(slippageBps))) / 10_000n;

  // build transaction data
  const txDetails: TransactionRequest = {
    to: CONTRACT_UNISWAP_V3_ROUTER.address,
    from: wallet.address,
    data: router.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: quote.fee,
        recipient: wallet.address,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
      },
    ]),
  };

  return executeTx(wallet, txDetails, dryRun);
}
