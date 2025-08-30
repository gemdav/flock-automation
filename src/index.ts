import { createWalletFromSRP } from "./wallets/walletManager.ts";
import { transferERC20Token } from "./transactions/erc20/transfer.ts";
import { log, err } from "./utils/logger.ts";
import "dotenv/config";
import { claimRewards } from "./transactions/flock/claimRewards.ts";
import { balanceOf } from "./transactions/erc20/balanceOf.ts";
import { exchangeFlock } from "./transactions/flock/exchangeFlock.ts";
import {
  CONTRACT_EURC,
  CONTRACT_FLOCK,
  CONTRACT_FLOCK_DELEGATE,
  CONTRACT_GMFLOCK,
  CONTRACT_GMFLOCK_EXCHANGE,
  CONTRACT_UNISWAP_V3_ROUTER,
  CONTRACT_USDC,
  CONTRACT_WETH,
} from "./contracts/contracts.ts";
import { approve } from "./transactions/erc20/approve.ts";
import { sleep } from "./utils/utils.ts";
import { delegate } from "./transactions/flock/delegate.ts";
import { getQuote } from "./transactions/uniswap/getQuote.ts";
import { swapExactInputSingle } from "./transactions/uniswap/swap.ts";
import { formatUnits } from "ethers";
import { unwrap } from "./transactions/weth/unwrap.ts";
import inquirer from "inquirer";

const wallet_metamask = createWalletFromSRP(process.env.SRP_METAMASK!);
const wallet_kraken = createWalletFromSRP(process.env.SRP_KRAKEN!);
const address_kraken = process.env.ADDRESS_KRAKEN!;

const DRY_RUN = false;

const FLOCK_ETH_THRESOLD = 0.00005;

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
  //TODO: delete me
  console.log("Values:");
  console.log(wallet_kraken);
  console.log(wallet_metamask);
  console.log(process.env.ADDRESS_KRAKEN);
  console.log(CONTRACT_FLOCK_DELEGATE);
  //TODO: delete me

  // Claim $FLOCK rewards and collect them in Kraken wallet
  await claimAndTransfer();

  await sleep(5000);
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
    choice =
      flockEth > FLOCK_ETH_THRESOLD ? PROCEDURE.SELL : PROCEDURE.DELEGATE;
  } else {
    // Get quotes
    await getRelevantQuotes();
    choice = await promptProcedure();
  }

  switch (choice) {
    case PROCEDURE.DELEGATE:
      // Exchange $FLOCK for $gmFLOCK and delegate it
      log("----------------------------------------------------------------");
      log("### Exchange $FLOCK for $gmFLOCK and delegate it ###");
      log("----------------------------------------------------------------");
      await exchangeAndDelegate();
      break;

    case PROCEDURE.SELL:
      // Sell $FLOCK if threshold rate is met
      log("----------------------------------------------------------------");
      log("### Sell $FLOCK for $ETH ###");
      log("----------------------------------------------------------------");
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
 * Get the procedure using a user prompt
 *
 * @returns the procedure
 */
async function promptProcedure(): Promise<ProcedureChoice> {
  const procedure = await inquirer.prompt([
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
  ]);
  return procedure.choice.id;
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
    claimRewards(wallet_kraken, CONTRACT_FLOCK_DELEGATE, DRY_RUN),
    claimRewards(wallet_metamask, CONTRACT_FLOCK_DELEGATE, DRY_RUN),
  ]);
  log(`Claim tx (Kraken): ${claimTxKraken}`);
  log(`Claim tx (MetaMask): ${claimTxMetaMask}`);

  // Fetch $FLOCK balances for both wallets
  await sleep(5000);
  const [flockBalanceKraken, flockBalanceMetaMask] = await Promise.all([
    balanceOf(wallet_kraken, CONTRACT_FLOCK),
    balanceOf(wallet_metamask, CONTRACT_FLOCK),
  ]);
  log(
    `$FLOCK balance (Kraken): ${formatUnits(
      flockBalanceKraken,
      CONTRACT_FLOCK.decimals
    )}`
  );
  log(
    `$FLOCK balance (MetaMask): ${formatUnits(
      flockBalanceMetaMask,
      CONTRACT_FLOCK.decimals
    )}`
  );

  // Transfer $FLOCK to Kraken wallet
  const transferTx = await transferERC20Token(
    wallet_metamask,
    CONTRACT_FLOCK,
    address_kraken,
    flockBalanceMetaMask,
    DRY_RUN
  );
  log(`Successfully transferred - transfer tx: ${transferTx}`);

  // Get updated $FLOCK balance in Kraken wallet
  await sleep(5000);
  const flockBalanceKrakenCombined = await balanceOf(
    wallet_kraken,
    CONTRACT_FLOCK
  );
  log(
    `$FLOCK balance (Kraken): ${formatUnits(
      flockBalanceKrakenCombined,
      CONTRACT_FLOCK.decimals
    )}`
  );
}

/**
 * Sells $FLOCK for $ETH using Uniswap V3.
 *
 * @param quote - Quote object containing fee and rate for the swap
 */
async function sellFlock() {
  // Get $FLOCK balance in Kraken wallet
  const flockBalanceKraken = await balanceOf(wallet_kraken, CONTRACT_FLOCK);

  // Get quote for swapping $FLOCK to $WETH
  let quote = await getQuote(CONTRACT_FLOCK, CONTRACT_WETH);
  if (!quote) {
    log("No $FLOCK => $WETH quote available. Stopping the program.");
    return;
  }

  // Approve Uniswap V3 Router to spend $FLOCK
  const approveSwapFlockForEthTx = await approve(
    wallet_kraken,
    CONTRACT_FLOCK,
    CONTRACT_UNISWAP_V3_ROUTER.address,
    flockBalanceKraken,
    DRY_RUN
  );
  log(`Approve swap $FLOCK => $WETH tx: ${approveSwapFlockForEthTx}`);

  // Swap $FLOCK for $WETH using Uniswap V3
  await sleep(5000);
  const swapFlockForEthTx = await swapExactInputSingle(
    wallet_kraken,
    CONTRACT_FLOCK,
    CONTRACT_WETH,
    quote,
    flockBalanceKraken
  );
  log(`Swap $FLOCK => $WETH tx: ${swapFlockForEthTx}`);

  // Get $WETH balance in Kraken wallet
  await sleep(5000);
  const wethBalanceKraken = await balanceOf(wallet_kraken, CONTRACT_WETH);

  // Approve Uniswap V3 Router to unwrap $WETH
  const approveUnwrapWETHTx = await approve(
    wallet_kraken,
    CONTRACT_WETH,
    CONTRACT_UNISWAP_V3_ROUTER.address,
    wethBalanceKraken,
    DRY_RUN
  );
  log(`Approve unwrap $WETH tx: ${approveUnwrapWETHTx}`);

  // Unwrap $WETH to $ETH using Uniswap V3
  await sleep(5000);
  const unwrapWETHTx = await unwrap(wallet_kraken, wethBalanceKraken);
  log(`Unwrap $WETH tx: ${unwrapWETHTx}`);
}

/**
 * Exchanges $FLOCK for $gmFLOCK and delegates it (Stake to Earn).
 */
async function exchangeAndDelegate() {
  // Get $FLOCK balance in Kraken wallet
  const flockBalanceKraken = await balanceOf(wallet_kraken, CONTRACT_FLOCK);

  // Approve $FLOCK for exchange
  const approveExchangeTx = await approve(
    wallet_kraken,
    CONTRACT_FLOCK,
    CONTRACT_GMFLOCK_EXCHANGE.address,
    flockBalanceKraken,
    DRY_RUN
  );
  log(`Approve exchange tx: ${approveExchangeTx}`);

  // Exchange $FLOCK for $gmFLOCK
  await sleep(5000);
  const exchangeTx = await exchangeFlock(
    wallet_kraken,
    flockBalanceKraken,
    DRY_RUN
  );
  log(`Exchange tx: ${exchangeTx}`);

  // Get $gmFLOCK balance in Kraken wallet
  await sleep(5000);
  const gmFlockBalanceKraken = await balanceOf(wallet_kraken, CONTRACT_GMFLOCK);
  log(
    `$gmFLOCK balance (Kraken): ${formatUnits(
      gmFlockBalanceKraken,
      CONTRACT_GMFLOCK.decimals
    )}`
  );

  // Approve $gmFLOCK for delegation
  const approveDelegateTx = await approve(
    wallet_kraken,
    CONTRACT_GMFLOCK,
    CONTRACT_FLOCK_DELEGATE.address,
    gmFlockBalanceKraken,
    DRY_RUN
  );
  log(`Approve delegate tx: ${approveDelegateTx}`);

  // Delegate $gmFLOCK to earn rewards
  await sleep(5000);
  const delegateTx = await delegate(
    wallet_kraken,
    CONTRACT_FLOCK_DELEGATE,
    gmFlockBalanceKraken,
    DRY_RUN
  );
  log(`Delegate tx: ${delegateTx}`);
}

main().catch(err);
