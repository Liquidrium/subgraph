/* eslint-disable prefer-const */
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  UniswapV3HyperLiquidrium as HyperLiquidriumContract,
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  Rebalance as RebalanceEvent,
} from "../../../generated/UniswapV3HyperLiquidrium1/UniswapV3HyperLiquidrium";
import {
  // Visor,
  UniswapV3HyperLiquidrium,
  UniswapV3Deposit,
  UniswapV3Rebalance,
  UniswapV3Withdraw,
  UniswapV3HyperLiquidriumShare,
} from "../../../generated/schema";
import { UniswapV3Pool as PoolTemplate } from "../../../generated/templates";
import { getOrCreateFactory } from "./hyperLiquidriumFactory";
import { getOrCreatePool } from "./pool";
import { createConversion } from "../tokens";
import { ADDRESS_ZERO, ZERO_BI, ONE_BI, ZERO_BD } from "../constants";

export function getOrCreateHyperLiquidrium(
  hyperLiquidriumAddress: Address,
  timestamp: BigInt
): UniswapV3HyperLiquidrium {
  let hyperLiquidriumId = hyperLiquidriumAddress.toHex();
  let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumId);

  // Check factory
  let factory = getOrCreateFactory(ADDRESS_ZERO);

  if (hyperLiquidrium == null) {
    let hyperLiquidriumContract = HyperLiquidriumContract.bind(hyperLiquidriumAddress);
    
    // Creating pool also creates tokens
    let poolAddress = hyperLiquidriumContract.pool();
    let pool = getOrCreatePool(poolAddress);

    // Update hyperLiquidriums linked to pool
    let hyperLiquidriums = pool.hyperLiquidriums;
    hyperLiquidriums.push(hyperLiquidriumId);
    pool.hyperLiquidriums = hyperLiquidriums;
    pool.save();

    hyperLiquidrium = new UniswapV3HyperLiquidrium(hyperLiquidriumId);
    hyperLiquidrium.pool = poolAddress.toHex();
    hyperLiquidrium.factory = factory.id;
    hyperLiquidrium.owner = hyperLiquidriumContract.owner();
    hyperLiquidrium.symbol = hyperLiquidriumContract.symbol();
    hyperLiquidrium.created = timestamp.toI32();
    hyperLiquidrium.tick = hyperLiquidriumContract.currentTick();
    hyperLiquidrium.baseLower = hyperLiquidriumContract.baseLower();
    hyperLiquidrium.baseUpper = hyperLiquidriumContract.baseUpper();
    hyperLiquidrium.limitLower = hyperLiquidriumContract.limitLower();
    hyperLiquidrium.limitUpper = hyperLiquidriumContract.limitUpper();
    hyperLiquidrium.deposit0Max = hyperLiquidriumContract.deposit0Max();
    hyperLiquidrium.deposit1Max = hyperLiquidriumContract.deposit1Max();
    hyperLiquidrium.totalSupply = hyperLiquidriumContract.totalSupply();
    hyperLiquidrium.maxTotalSupply = hyperLiquidriumContract.maxTotalSupply();
    hyperLiquidrium.grossFeesClaimed0 = ZERO_BI;
    hyperLiquidrium.grossFeesClaimed1 = ZERO_BI;
    hyperLiquidrium.grossFeesClaimedUSD = ZERO_BD;
    hyperLiquidrium.protocolFeesCollected0 = ZERO_BI;
    hyperLiquidrium.protocolFeesCollected1 = ZERO_BI;
    hyperLiquidrium.protocolFeesCollectedUSD = ZERO_BD;
    hyperLiquidrium.feesReinvested0 = ZERO_BI;
    hyperLiquidrium.feesReinvested1 = ZERO_BI;
    hyperLiquidrium.feesReinvestedUSD = ZERO_BD;
    hyperLiquidrium.tvl0 = ZERO_BI;
    hyperLiquidrium.tvl1 = ZERO_BI;
    hyperLiquidrium.tvlUSD = ZERO_BD;
    hyperLiquidrium.pricePerShare = ZERO_BD;
    // hyperLiquidrium.visorCount = ZERO_BI;
    hyperLiquidrium.conversion = hyperLiquidriumId;
    hyperLiquidrium.lastUpdated = timestamp;
    hyperLiquidrium.save();

    // let factoryHyperLiquidriums = factory.hyperLiquidriums;
    // factoryHyperLiquidriums.push(hyperLiquidriumId);
    // factory.hyperLiquidriums = factoryHyperLiquidriums;
    factory.hyperLiquidriumCount += ONE_BI;
    factory.save();

    // Create Conversion entity to track path to USD calculations
    createConversion(hyperLiquidriumId);

    PoolTemplate.create(poolAddress);
  }

  return hyperLiquidrium as UniswapV3HyperLiquidrium;
}

export function createDeposit(event: DepositEvent): UniswapV3Deposit {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  let deposit = new UniswapV3Deposit(id);
  deposit.hyperLiquidrium = event.address.toHex();
  deposit.timestamp = event.block.timestamp;
  deposit.sender = event.params.sender;
  deposit.to = event.params.to;
  deposit.shares = event.params.shares;
  deposit.amount0 = event.params.amount0;
  deposit.amount1 = event.params.amount1;

  return deposit as UniswapV3Deposit;
}

export function createRebalance(event: RebalanceEvent): UniswapV3Rebalance {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  // 60% fee is hardcoded in the contracts
  let protocolFeeRate = BigInt.fromI32(60);

  let rebalance = new UniswapV3Rebalance(id);
  rebalance.hyperLiquidrium = event.address.toHex();
  rebalance.timestamp = event.block.timestamp;
  rebalance.tick = event.params.tick;
  rebalance.totalAmount0 = event.params.totalAmount0;
  rebalance.totalAmount1 = event.params.totalAmount1;
  rebalance.grossFees0 = event.params.feeAmount0;
  rebalance.grossFees1 = event.params.feeAmount1;
  rebalance.protocolFees0 = rebalance.grossFees0 * protocolFeeRate / BigInt.fromI32(100);
  rebalance.protocolFees1 = rebalance.grossFees1 * protocolFeeRate / BigInt.fromI32(100);
  rebalance.netFees0 = rebalance.grossFees0 - rebalance.protocolFees0;
  rebalance.netFees1 = rebalance.grossFees1 - rebalance.protocolFees1;
  rebalance.totalSupply = event.params.totalSupply;

  // Read rebalance limits from contract as not available in event
  let hyperLiquidriumContract = HyperLiquidriumContract.bind(event.address);
  rebalance.baseLower = hyperLiquidriumContract.baseLower();
  rebalance.baseUpper = hyperLiquidriumContract.baseUpper();
  rebalance.limitLower = hyperLiquidriumContract.limitLower();
  rebalance.limitUpper = hyperLiquidriumContract.limitUpper();

  return rebalance as UniswapV3Rebalance;
}

export function createWithdraw(event: WithdrawEvent): UniswapV3Withdraw {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  let withdraw = new UniswapV3Withdraw(id);
  withdraw.hyperLiquidrium = event.address.toHex();
  withdraw.timestamp = event.block.timestamp;
  withdraw.sender = event.params.sender;
  withdraw.to = event.params.to;
  withdraw.shares = event.params.shares;
  withdraw.amount0 = event.params.amount0;
  withdraw.amount1 = event.params.amount1;

  return withdraw as UniswapV3Withdraw;
}

export function getOrCreateHyperLiquidriumShare(
  event: DepositEvent
): UniswapV3HyperLiquidriumShare {
  let hyperLiquidriumAddress = event.address.toHex();
  let visorAddress = event.params.to.toHex();

  let id = hyperLiquidriumAddress + "-" + visorAddress;

  let hyperLiquidriumShare = UniswapV3HyperLiquidriumShare.load(id);
  if (hyperLiquidriumShare == null) {
    hyperLiquidriumShare = new UniswapV3HyperLiquidriumShare(id);
    hyperLiquidriumShare.hyperLiquidrium = hyperLiquidriumAddress;
    hyperLiquidriumShare.address = Address.fromString(visorAddress);
    hyperLiquidriumShare.shares = ZERO_BI;
    hyperLiquidriumShare.initialToken0 = ZERO_BI;
    hyperLiquidriumShare.initialToken1 = ZERO_BI;
    hyperLiquidriumShare.initialUSD = ZERO_BD;
    // increment counts
    // let visor = Visor.load(visorAddress);
    // if (visor != null) {
    //   visor.hyperLiquidriumCount += ONE_BI;
    //   visor.save();
    // }
    // let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumAddress) as UniswapV3HyperLiquidrium;
    // hyperLiquidrium.visorCount += ONE_BI;
    // hyperLiquidrium.save();
  }

  return hyperLiquidriumShare as UniswapV3HyperLiquidriumShare;
}
