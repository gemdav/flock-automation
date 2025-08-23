import { ERC20_ABI } from "./constants.ts";
import { ContractConfig } from "../types/contractConfig.ts";

export const CONTRACT_EURC: ContractConfig = {
  address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  decimals: 6,
  abi: ERC20_ABI,
};

export const CONTRACT_USDC: ContractConfig = {
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  decimals: 6,
  abi: ERC20_ABI,
};

export const CONTRACT_WETH: ContractConfig = {
  address: "0x4200000000000000000000000000000000000006",
  decimals: 18,
  abi: ERC20_ABI.concat(["function withdraw(uint256 wad) public"]),
};

export const CONTRACT_FLOCK: ContractConfig = {
  address: "0x5aB3D4c385B400F3aBB49e80DE2fAF6a88A7B691",
  decimals: 18,
  abi: ERC20_ABI,
};

export const CONTRACT_GMFLOCK: ContractConfig = {
  address: "0x781dd21D8430E4e267aF5713E01332742f5CAD24",
  decimals: 18,
  abi: ERC20_ABI,
};

export const CONTRACT_GMFLOCK_EXCHANGE: ContractConfig = {
  address: "0xe1fa4592b7a35ff6cef65fdec5e13a1f48fc6123",
  decimals: 18,
  abi: [
    "function exchangeFlock(uint256 flockAmount, uint256 lockPeriod, address beneficiary)",
  ],
};

export const CONTRACT_FLOCK_DELEGATE: ContractConfig = {
  address: "0x9fa8108292784f960cdb8abdb65198ea000e3f34",
  decimals: 18,
  abi: ["function claimRewards()", "function delegate(uint256 amount)"],
};

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
