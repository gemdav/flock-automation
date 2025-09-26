import { ContractConfig } from "../types/contractConfig.ts";
import { ERC20_ABI } from "./constants.ts";

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
