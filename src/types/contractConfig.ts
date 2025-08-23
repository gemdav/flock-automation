import { InterfaceAbi } from "ethers";

export interface ContractConfig {
  address: string;
  decimals: number;
  abi: InterfaceAbi;
}
