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
import readlineSync from "readline-sync";
import { unwrap } from "./transactions/weth/unwrap.ts";

const wallet_metamask = createWalletFromSRP(process.env.SRP_METAMASK!);
const wallet_kraken = createWalletFromSRP(process.env.SRP_KRAKEN!);
const address_kraken = process.env.ADDRESS_KRAKEN!;

const DRY_RUN = false; // Set to true for dry run mode

async function main() {
  // Claim $FLOCK rewards and collect them in Kraken wallet
  log("----------------------------------------------------------------");
  log("### Claim $FLOCK rewards and collect in Kraken wallet ###");
  await claimAndTransfer();

  // Get quotes
  log("----------------------------------------------------------------");
  log("### Get $FLOCK quotes ###");
  let quoteFlockEth = await getQuote(CONTRACT_FLOCK, CONTRACT_WETH);
  log(`$FLOCK => $WETH quote: ${quoteFlockEth?.rate}`);
  let quoteEthEur = await getQuote(CONTRACT_WETH, CONTRACT_EURC);
  log(`$WETH => $EURC quote: ${quoteEthEur?.rate}`);
  let quoteFlockEur = quoteFlockEth?.rate! * quoteEthEur?.rate!;
  log(`$FLOCK => $EURC quote: ${quoteFlockEur}`);
  let quoteEthUsd = await getQuote(CONTRACT_WETH, CONTRACT_USDC);
  log(`$WETH => $USDC quote: ${quoteEthUsd?.rate}`);
  let quoteFlockUsd = quoteFlockEth?.rate! * quoteEthUsd?.rate!;
  log(`$FLOCK => $USDC quote: ${quoteFlockUsd}`);

  const choice = readlineSync
    .question(
      "How to proceed with the claimed $FLOCK?:\n(a) Exchange for $gmFLOCK and delegate\n(b) Sell for $ETH\n(c) Stop program\nYour choice: "
    )
    .trim()
    .toLowerCase();

  switch (choice) {
    case "a":
      // Exchange $FLOCK for $gmFLOCK and delegate it
      log("----------------------------------------------------------------");
      log("### Exchange $FLOCK for $gmFLOCK and delegate it ###");
      await exchangeAndDelegate();
      break;
    case "b":
      // Sell $FLOCK if threshold rate is met
      //log("Option currently not available.");
      //return;
      log("----------------------------------------------------------------");
      log("### Sell $FLOCK for $ETH ###");
      await sellFlock();
      break;
    case "c":
      log("Stopping the program.");
      // Stop the program
      return;
    default:
      // Stop the program with an invalid choice
      log("Invalid choice. Stopping the program.");
      return;
  }
}

/**
 * Claims $FLOCK rewards for MetaMask and Kraken wallets and
 * transfers the MetaMask $FLOCK balance to the Kraken wallet.
 */
async function claimAndTransfer() {
  // Claim $FLOCK rewards for Kraken wallet
  const claimTxKraken = await claimRewards(
    wallet_kraken,
    CONTRACT_FLOCK_DELEGATE,
    DRY_RUN
  );
  log(`Claim tx (Kraken): ${claimTxKraken}`);

  // Get $FLOCK balance in Kraken wallet
  await sleep(5000);
  const flockBalanceKraken = await balanceOf(wallet_kraken, CONTRACT_FLOCK);
  log(
    `$FLOCK balance (Kraken): ${formatUnits(
      flockBalanceKraken,
      CONTRACT_FLOCK.decimals
    )}`
  );

  // Claim $FLOCK rewards for MetaMask wallet
  const claimTxMetaMask = await claimRewards(
    wallet_metamask,
    CONTRACT_FLOCK_DELEGATE,
    DRY_RUN
  );
  log(`Claim tx (MetaMask): ${claimTxMetaMask}`);

  // Get $FLOCK balance in MetaMask wallet
  await sleep(5000);
  const flockBalanceMetaMask = await balanceOf(wallet_metamask, CONTRACT_FLOCK);
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
