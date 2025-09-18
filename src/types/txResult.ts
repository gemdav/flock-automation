import { TransactionReceipt, TransactionResponse } from "ethers";

export interface TxResult {
  tx?: TransactionResponse | null;
  receipt?: TransactionReceipt | null;
  message?: string;
}
