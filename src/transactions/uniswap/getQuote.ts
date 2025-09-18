import { ethers, formatUnits, JsonRpcProvider, parseUnits } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { CONTRACT_UNISWAP_V3_QUOTER } from "../../contracts/contracts.ts";
import { UniswapQuote } from "../../types/uniswapQuote.ts";

const PROVIDER_BASE = new JsonRpcProvider("https://mainnet.base.org");

/**
 * Gets a quote for swapping `amountIn` of `tokenIn` for `tokenOut` using Uniswap V3.
 *
 * @param {ContractConfig} tokenIn - Input token configuration.
 * @param {ContractConfig} tokenOut - Output token configuration.
 * @param {bigint} amountIn - Amount of input token to swap.
 * @returns {Promise<UniswapQuote | null>} - Quote object with fee and rate, or null if no pool found.
 */
export async function getQuote(
  tokenIn: ContractConfig,
  tokenOut: ContractConfig,
  amountIn: bigint = parseUnits("1", tokenIn.decimals)
): Promise<UniswapQuote | null> {
  const quoter = new ethers.Contract(CONTRACT_UNISWAP_V3_QUOTER.address, CONTRACT_UNISWAP_V3_QUOTER.abi, PROVIDER_BASE);

  const feeTiers: number[] = [100, 500, 3000, 10000];
  let bestQuote: UniswapQuote | null = null;

  for (const fee of feeTiers) {
    try {
      const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee,
        amountIn,
        sqrtPriceLimitX96: 0n,
      });

      if (amountOut > 0n && (!bestQuote || amountOut > bestQuote.amountOut)) {
        const normalizedIn = Number(formatUnits(amountIn, tokenIn.decimals));
        const normalizedOut = Number(formatUnits(amountOut, tokenOut.decimals));
        const rate = normalizedOut / normalizedIn;
        bestQuote = { fee, amountOut, rate };
      }
    } catch (e) {
      // ignore errors (e.g., no pool for this fee tier)
    }
  }
  return bestQuote;
}
