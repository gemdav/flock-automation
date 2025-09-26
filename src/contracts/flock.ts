import { BASE_DELEGATE_CONTRACT } from "./constants.ts";
import { ContractConfig } from "../types/contractConfig.ts";

export const CONTRACT_GMFLOCK_EXCHANGE: ContractConfig = {
  address: "0xe1fa4592b7a35ff6cef65fdec5e13a1f48fc6123",
  decimals: 18,
  abi: ["function exchangeFlock(uint256 flockAmount, uint256 lockPeriod, address beneficiary)"],
};

export const CONTRACT_FLOCK_DELEGATE_KOOLTEK: ContractConfig = {
  address: "0x9fa8108292784f960cdb8abdb65198ea000e3f34",
  ...BASE_DELEGATE_CONTRACT,
};

export const CONTRACT_FLOCK_DELEGATE_JERRY: ContractConfig = {
  address: "0x0ff123e4cf73ea544a72e3d4696d78938567a709",
  ...BASE_DELEGATE_CONTRACT,
};

export const CONTRACT_FLOCK_DELEGATE_TOBENO1: ContractConfig = {
  address: "0xad1e275359a7e5293faacec67b2417196df0616b",
  ...BASE_DELEGATE_CONTRACT,
};

export const CONTRACT_FLOCK_DELEGATE_ALWAYSONLINE: ContractConfig = {
  address: "0x0797e8fc1a0fa39281c1ff40e832808bf685dddf",
  ...BASE_DELEGATE_CONTRACT,
};

export const CONTRACT_FLOCK_DELEGATE_FLOCKGUARD: ContractConfig = {
  address: "0x25bc7f8a227b71d0ac98df5f8efac39f15ab1f41",
  ...BASE_DELEGATE_CONTRACT,
};
