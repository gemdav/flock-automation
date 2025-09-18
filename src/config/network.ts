import "dotenv/config";

export const NETWORKS = {
  base: {
    name: "base",
    chainId: 8453, // Base mainnet chain ID
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY!}`,
  },
};
