import { ContractConfig } from "../types/contractConfig.ts";

export const CONTRACT_UNISWAP_V3_QUOTER: ContractConfig = {
  address: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  decimals: 18,
  abi: [
    "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
  ],
};

export const CONTRACT_UNISWAP_V3_ROUTER: ContractConfig = {
  address: "0x2626664c2603336E57B271c5C0b26F421741e481",
  decimals: 18,
  abi: [
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
    "function unwrapWETH9(uint256 amountMinimum) payable",
  ],
};
