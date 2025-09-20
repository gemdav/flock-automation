import { ContractConfig } from "../types/contractConfig";

export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export const BASE_DELEGATE_CONTRACT: Omit<ContractConfig, "address"> = {
  decimals: 18,
  abi: ["function claimRewards()", "function delegate(uint256 amount)"],
};
