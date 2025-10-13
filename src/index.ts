import { createWalletFromSRP } from "./wallets/walletManager.ts";
import { transferERC20Token } from "./transactions/erc20/transfer.ts";
import { log, err } from "./utils/logger.ts";
import { claimRewards } from "./transactions/flock/claimRewards.ts";
import { balanceOf } from "./transactions/erc20/balanceOf.ts";
import { exchangeFlock } from "./transactions/flock/exchangeFlock.ts";
import { approve } from "./transactions/erc20/approve.ts";
import { delegate } from "./transactions/flock/delegate.ts";
import { getQuote } from "./transactions/uniswap/getQuote.ts";
import { swapExactInputSingle } from "./transactions/uniswap/swap.ts";
import { formatUnits } from "ethers";
import { unwrap } from "./transactions/weth/unwrap.ts";
import inquirer from "inquirer";
import "dotenv/config";
import {
  CONTRACT_FLOCK_DELEGATE_KOOLTEK as CONTRACT_FLOCK_DELEGATE,
  CONTRACT_GMFLOCK_EXCHANGE,
} from "./contracts/flock.ts";
import { CONTRACT_EURC, CONTRACT_FLOCK, CONTRACT_GMFLOCK, CONTRACT_USDC, CONTRACT_WETH } from "./contracts/tokens.ts";
import { CONTRACT_UNISWAP_V3_ROUTER } from "./contracts/uniswap.ts";

const WALLET_METAMASK = createWalletFromSRP(process.env.SRP_METAMASK!);
const WALLET_KRAKEN = createWalletFromSRP(process.env.SRP_KRAKEN!);
const ADDRESS_KRAKEN = process.env.ADDRESS_KRAKEN!;

const DRY_RUN = process.env.DRY_RUN === "true";

const FLOCK_ETH_THRESOLD = Number(process.env.FLOCK_ETH_THRESOLD!) || 1;

type ProcedureChoice = (typeof PROCEDURE)[keyof typeof PROCEDURE];
const PROCEDURE = {
  DELEGATE: 1,
  SELL: 2,
  STOP: 3,
};

/**
 * Main function
 */
async function main() {
  // Claim $FLOCK rewards and collect them in Kraken wallet
  await claimAndTransfer();

  let choice: ProcedureChoice;
  const args = process.argv.slice(2);
  if (args.includes("--delegate")) {
    choice = PROCEDURE.DELEGATE;
  } else if (args.includes("--sell")) {
    choice = PROCEDURE.SELL;
  } else if (args.includes("--stop")) {
    choice = PROCEDURE.STOP;
  } else if (args.includes("--threshold")) {
    let flockEth = (await getQuote(CONTRACT_FLOCK, CONTRACT_WETH))?.rate || 0;
    log(`Threshold: ${FLOCK_ETH_THRESOLD}, current rate: ${flockEth}`);
    choice = flockEth > FLOCK_ETH_THRESOLD ? PROCEDURE.SELL : PROCEDURE.DELEGATE;
  } else {
    // Get quotes
    await getRelevantQuotes();
    choice = (
      await inquirer.prompt([
        {
          type: "list",
          name: "choice",
          message: "How to proceed with the claimed $FLOCK:",
          choices: [
            {
              name: "Exchange for $gmFLOCK and delegate",
              value: { id: PROCEDURE.DELEGATE },
            },
            { name: "Sell for $ETH", value: { id: PROCEDURE.SELL } },
            { name: "Stop program", value: { id: PROCEDURE.STOP } },
          ],
        },
      ])
    ).choice.id;
  }

  switch (choice) {
    case PROCEDURE.DELEGATE:
      // Exchange $FLOCK for $gmFLOCK and delegate it
      await exchangeAndDelegate();
      break;

    case PROCEDURE.SELL:
      // Sell $FLOCK if threshold rate is met
      await sellFlock();
      break;

    case PROCEDURE.STOP:
      // Stop the program
      log("Stopping the program.");
      return;

    default:
      // Stop the program with an invalid choice
      log("Invalid choice. Stopping the program.");
      return;
  }
}

/**
 * Gets the relevant quotes to make a procedure decision
 */
async function getRelevantQuotes() {
  log("----------------------------------------------------------------");
  log("### Get $FLOCK quotes ###");
  log("----------------------------------------------------------------");

  const [flockEth, ethEur, ethUsd] = await Promise.all([
    getQuote(CONTRACT_FLOCK, CONTRACT_WETH),
    getQuote(CONTRACT_WETH, CONTRACT_EURC),
    getQuote(CONTRACT_WETH, CONTRACT_USDC),
  ]);
  const FlockEur = (flockEth?.rate ?? 0) * (ethEur?.rate ?? 0);
  const FlockUsd = (flockEth?.rate ?? 0) * (ethUsd?.rate ?? 0);
  log(`$FLOCK => $WETH quote: ${flockEth?.rate}`);
  log(`$WETH => $EURC quote: ${ethEur?.rate}`);
  log(`$FLOCK => $EURC quote: ${FlockEur}`);
  log(`$WETH => $USDC quote: ${ethUsd?.rate}`);
  log(`$FLOCK => $USDC quote: ${FlockUsd}`);
}

/**
 * Claims $FLOCK rewards for MetaMask and Kraken wallets and
 * transfers the MetaMask $FLOCK balance to the Kraken wallet.
 */
async function claimAndTransfer() {
  log("----------------------------------------------------------------");
  log("### Claim $FLOCK rewards and collect in Kraken wallet ###");
  log("----------------------------------------------------------------");

  // Claim $FLOCK rewards for both wallets in parallel
  const [claimTxKraken, claimTxMetaMask] = await Promise.all([
    claimRewards(WALLET_KRAKEN, CONTRACT_FLOCK_DELEGATE, DRY_RUN),
    claimRewards(WALLET_METAMASK, CONTRACT_FLOCK_DELEGATE, DRY_RUN),
  ]);
  log(`Claim tx (Kraken): ${claimTxKraken.message}`);
  log(`Claim tx (MetaMask): ${claimTxMetaMask.message}`);

  // Fetch $FLOCK balances for both wallets
  const [flockBalanceKraken, flockBalanceMetaMask] = await Promise.all([
    balanceOf(WALLET_KRAKEN, CONTRACT_FLOCK, claimTxKraken.receipt?.blockNumber),
    balanceOf(WALLET_METAMASK, CONTRACT_FLOCK, claimTxMetaMask.receipt?.blockNumber),
  ]);
  log(`$FLOCK balance (Kraken): ${formatUnits(flockBalanceKraken, CONTRACT_FLOCK.decimals)}`);
  log(`$FLOCK balance (MetaMask): ${formatUnits(flockBalanceMetaMask, CONTRACT_FLOCK.decimals)}`);

  // Transfer $FLOCK to Kraken wallet
  const transferTx = await transferERC20Token(
    WALLET_METAMASK,
    CONTRACT_FLOCK,
    ADDRESS_KRAKEN,
    flockBalanceMetaMask,
    DRY_RUN
  );
  log(`Successfully transferred - transfer tx: ${transferTx.message}`);

  // Get updated $FLOCK balance in Kraken wallet
  const flockBalanceKrakenCombined = await balanceOf(WALLET_KRAKEN, CONTRACT_FLOCK, transferTx.receipt?.blockNumber);
  log(`$FLOCK balance (Kraken): ${formatUnits(flockBalanceKrakenCombined, CONTRACT_FLOCK.decimals)}`);
}

/**
 * Sells $FLOCK for $ETH using Uniswap V3.
 *
 * @param quote - Quote object containing fee and rate for the swap
 */
async function sellFlock() {
  log("----------------------------------------------------------------");
  log("### Sell $FLOCK for $ETH ###");
  log("----------------------------------------------------------------");

  // Get $FLOCK balance in Kraken wallet
  const flockBalanceKraken = await balanceOf(WALLET_KRAKEN, CONTRACT_FLOCK);

  // Get quote for swapping $FLOCK to $WETH
  let quote = await getQuote(CONTRACT_FLOCK, CONTRACT_WETH, flockBalanceKraken);
  if (!quote) {
    log("No $FLOCK => $WETH quote available. Stopping the program.");
    return;
  }

  // Approve Uniswap V3 Router to spend $FLOCK
  const approveSwapFlockForEthTx = await approve(
    WALLET_KRAKEN,
    CONTRACT_FLOCK,
    CONTRACT_UNISWAP_V3_ROUTER.address,
    flockBalanceKraken,
    DRY_RUN
  );
  log(`Approve swap $FLOCK => $WETH tx: ${approveSwapFlockForEthTx.message}`);

  // Swap $FLOCK for $WETH using Uniswap V3
  const swapFlockForEthTx = await swapExactInputSingle(
    WALLET_KRAKEN,
    CONTRACT_FLOCK,
    CONTRACT_WETH,
    quote,
    flockBalanceKraken
  );
  log(`Swap $FLOCK => $WETH tx: ${swapFlockForEthTx.message}`);

  // Get $WETH balance in Kraken wallet
  const wethBalanceKraken = await balanceOf(WALLET_KRAKEN, CONTRACT_WETH, swapFlockForEthTx.receipt?.blockNumber);

  // Unwrap $WETH to $ETH using Uniswap V3
  const unwrapWETHTx = await unwrap(WALLET_KRAKEN, wethBalanceKraken);
  log(`Unwrap $WETH tx: ${unwrapWETHTx.message}`);
}

/**
 * Exchanges $FLOCK for $gmFLOCK and delegates it (Stake to Earn).
 */
async function exchangeAndDelegate() {
  log("----------------------------------------------------------------");
  log("### Exchange $FLOCK for $gmFLOCK and delegate it ###");
  log("----------------------------------------------------------------");

  // Get $FLOCK balance in Kraken wallet
  const flockBalanceKraken = await balanceOf(WALLET_KRAKEN, CONTRACT_FLOCK);

  // Approve $FLOCK for exchange
  const approveExchangeTx = await approve(
    WALLET_KRAKEN,
    CONTRACT_FLOCK,
    CONTRACT_GMFLOCK_EXCHANGE.address,
    flockBalanceKraken,
    DRY_RUN
  );
  log(`Approve exchange tx: ${approveExchangeTx.message}`);

  // Exchange $FLOCK for $gmFLOCK
  const exchangeTx = await exchangeFlock(WALLET_KRAKEN, flockBalanceKraken, DRY_RUN);
  log(`Exchange tx: ${exchangeTx.message}`);

  // Get $gmFLOCK balance in Kraken wallet
  const gmFlockBalanceKraken = await balanceOf(WALLET_KRAKEN, CONTRACT_GMFLOCK, exchangeTx.receipt?.blockNumber);
  log(`$gmFLOCK balance (Kraken): ${formatUnits(gmFlockBalanceKraken, CONTRACT_GMFLOCK.decimals)}`);

  // Approve $gmFLOCK for delegation
  const approveDelegateTx = await approve(
    WALLET_KRAKEN,
    CONTRACT_GMFLOCK,
    CONTRACT_FLOCK_DELEGATE.address,
    gmFlockBalanceKraken,
    DRY_RUN
  );
  log(`Approve delegate tx: ${approveDelegateTx.message}`);

  // Delegate $gmFLOCK to earn rewards
  const delegateTx = await delegate(
    WALLET_KRAKEN,
    CONTRACT_FLOCK_DELEGATE,
    CONTRACT_GMFLOCK,
    gmFlockBalanceKraken,
    DRY_RUN
  );
  log(`Delegate tx: ${delegateTx.message}`);
}

main().catch(err);
