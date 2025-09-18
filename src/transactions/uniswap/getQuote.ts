import { ethers, formatUnits, JsonRpcProvider, parseUnits } from "ethers";
import { ContractConfig } from "../../types/contractConfig.ts";
import { CONTRACT_UNISWAP_V3_QUOTER } from "../../contracts/contracts.ts";
import { UniswapQuote } from "../../types/uniswapQuote.ts";
import { log } from "../../utils/logger.ts";
import { sleep } from "../../utils/utils.ts";

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

  let i = 0;
  while (i < feeTiers.length) {
    const fee = feeTiers[i];
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
      i++;
    } catch (e: any) {
      if (e.info?.error?.message.includes("over rate limit")) {
        // retry if failure is due to rate limiting
        log("Rate limit hit, retrying after 5s cooldown ...");
        await sleep(5000);
      } else {
        // ignore all other errors (e.g., no pool for this fee tier)
        i++;
      }
    }
  }
  return bestQuote;
}
