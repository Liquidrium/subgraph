/* eslint-disable prefer-const */
import { Address, store } from '@graphprotocol/graph-ts'
import { 
	Deposit as DepositEvent,
	Withdraw as WithdrawEvent,
	Rebalance as RebalanceEvent,
	SetDepositMaxCall,
	SetMaxTotalSupplyCall
} from "../../../generated/UniswapV3HyperLiquidrium1/UniswapV3HyperLiquidrium"
import {
	// Visor,
	UniswapV3HyperLiquidriumShare,
	UniswapV3HyperLiquidriumConversion
} from "../../../generated/schema"
import { 
	createDeposit,
	createRebalance,
	createWithdraw,
	getOrCreateHyperLiquidrium,
	getOrCreateHyperLiquidriumShare
} from "../../utils/uniswapV3/hyperLiquidrium"
import { updateAndGetUniswapV3HyperLiquidriumDayData } from "../../utils/intervalUpdates"
import { getExchangeRate, getBaseTokenRateInUSDC } from "../../utils/pricing"
import { resetAggregates, updateAggregates, updateTvl } from "../../utils/aggregation"
import { ONE_BI, ZERO_BD } from "../../utils/constants"


export function handleDeposit(event: DepositEvent): void {

	let hyperLiquidrium = getOrCreateHyperLiquidrium(event.address, event.block.timestamp)
	let hyperLiquidriumId = event.address.toHex()

	// Reset aggregates until new amounts are calculated
	resetAggregates(hyperLiquidriumId)

	// Create deposit event
	let deposit = createDeposit(event)
	let conversion = UniswapV3HyperLiquidriumConversion.load(hyperLiquidriumId) as UniswapV3HyperLiquidriumConversion

	let price = getExchangeRate(Address.fromString(hyperLiquidrium.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hyperLiquidriumId)
	
	if (conversion.baseTokenIndex == 0) {
		// If token0 is base token, then we convert token1 to the base token
		deposit.amountUSD = (deposit.amount1.toBigDecimal() * price + deposit.amount0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is base token, then we convert token0 to the base token
		deposit.amountUSD = (deposit.amount0.toBigDecimal() * price + deposit.amount1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is WETH, don't track USD
		deposit.amountUSD = ZERO_BD
	}
	deposit.save()

	// Update visor shares
	let hyperLiquidriumShare = getOrCreateHyperLiquidriumShare(event)
	hyperLiquidriumShare.shares += deposit.shares
	hyperLiquidriumShare.initialToken0 += deposit.amount0
	hyperLiquidriumShare.initialToken1 += deposit.amount1
	hyperLiquidriumShare.initialUSD += deposit.amountUSD
	hyperLiquidriumShare.save()

	updateTvl(event.address)
	updateAggregates(hyperLiquidriumId)
	
	// Aggregate daily data
	let hyperLiquidriumDayData = updateAndGetUniswapV3HyperLiquidriumDayData(hyperLiquidriumId)
	hyperLiquidriumDayData.deposited0 += deposit.amount0
    hyperLiquidriumDayData.deposited1 += deposit.amount1
    hyperLiquidriumDayData.depositedUSD += deposit.amountUSD
    hyperLiquidriumDayData.save()
}

export function handleRebalance(event: RebalanceEvent): void {

	let hyperLiquidrium = getOrCreateHyperLiquidrium(event.address, event.block.timestamp)
	let hyperLiquidriumId = event.address.toHex()

	// Reset aggregates until new amounts are calculated
	resetAggregates(hyperLiquidriumId)
	
	// Create rebalance
	let rebalance = createRebalance(event)
	let conversion = UniswapV3HyperLiquidriumConversion.load(hyperLiquidriumId) as UniswapV3HyperLiquidriumConversion

	let price = getExchangeRate(Address.fromString(hyperLiquidrium.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hyperLiquidriumId)

	if (conversion.baseTokenIndex == 0) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount1.toBigDecimal() * price + rebalance.totalAmount0.toBigDecimal()) * baseTokenInUSDC
		rebalance.grossFeesUSD = (rebalance.grossFees1.toBigDecimal() * price + rebalance.grossFees0.toBigDecimal()) * baseTokenInUSDC
		rebalance.protocolFeesUSD = (rebalance.protocolFees1.toBigDecimal() * price + rebalance.protocolFees0.toBigDecimal()) * baseTokenInUSDC
		rebalance.netFeesUSD = (rebalance.netFees1.toBigDecimal() * price + rebalance.netFees0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount0.toBigDecimal() * price + rebalance.totalAmount1.toBigDecimal()) * baseTokenInUSDC
		rebalance.grossFeesUSD = (rebalance.grossFees0.toBigDecimal() * price+ rebalance.grossFees1.toBigDecimal()) * baseTokenInUSDC
		rebalance.protocolFeesUSD = (rebalance.protocolFees0.toBigDecimal() * price + rebalance.protocolFees1.toBigDecimal()) * baseTokenInUSDC
		rebalance.netFeesUSD = (rebalance.netFees0.toBigDecimal() * price + rebalance.netFees1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is WETH, don't track USD
		rebalance.totalAmountUSD = ZERO_BD
		rebalance.grossFeesUSD = ZERO_BD
		rebalance.protocolFeesUSD = ZERO_BD
		rebalance.netFeesUSD = ZERO_BD
	}
	rebalance.save()
	
	// Update relevant hyperLiquidrium fields
	hyperLiquidrium.tick = rebalance.tick
	hyperLiquidrium.grossFeesClaimed0 += rebalance.grossFees0
	hyperLiquidrium.grossFeesClaimed1 += rebalance.grossFees1
	hyperLiquidrium.grossFeesClaimedUSD += rebalance.grossFeesUSD
	hyperLiquidrium.protocolFeesCollected0 += rebalance.protocolFees0
	hyperLiquidrium.protocolFeesCollected1 += rebalance.protocolFees1
	hyperLiquidrium.protocolFeesCollectedUSD += rebalance.protocolFeesUSD
	hyperLiquidrium.feesReinvested0 += rebalance.netFees0
	hyperLiquidrium.feesReinvested1 += rebalance.netFees1
	hyperLiquidrium.feesReinvestedUSD += rebalance.netFeesUSD
	hyperLiquidrium.baseLower = rebalance.baseLower
	hyperLiquidrium.baseUpper = rebalance.baseUpper
	hyperLiquidrium.limitLower = rebalance.limitLower
	hyperLiquidrium.limitUpper = rebalance.limitUpper
	hyperLiquidrium.save()

	updateTvl(event.address)
	updateAggregates(hyperLiquidriumId)

	// Aggregate daily data	
	let hyperLiquidriumDayData = updateAndGetUniswapV3HyperLiquidriumDayData(hyperLiquidriumId)
	hyperLiquidriumDayData.grossFeesClaimed0 += rebalance.grossFees0
	hyperLiquidriumDayData.grossFeesClaimed1 += rebalance.grossFees1
	hyperLiquidriumDayData.grossFeesClaimedUSD += rebalance.grossFeesUSD
	hyperLiquidriumDayData.protocolFeesCollected0 += rebalance.protocolFees0
	hyperLiquidriumDayData.protocolFeesCollected1 += rebalance.protocolFees1
	hyperLiquidriumDayData.protocolFeesCollectedUSD += rebalance.protocolFeesUSD
	hyperLiquidriumDayData.feesReinvested0 += rebalance.netFees0
	hyperLiquidriumDayData.feesReinvested1 += rebalance.netFees1
	hyperLiquidriumDayData.feesReinvestedUSD += rebalance.netFeesUSD
    hyperLiquidriumDayData.save()
}

export function handleWithdraw(event: WithdrawEvent): void {

	let hyperLiquidrium = getOrCreateHyperLiquidrium(event.address, event.block.timestamp)
	let hyperLiquidriumId = event.address.toHex()

	// Reset factory aggregates until new values are calculated
	resetAggregates(hyperLiquidriumId)

	// Create Withdraw event
	let withdraw = createWithdraw(event)
	let conversion = UniswapV3HyperLiquidriumConversion.load(hyperLiquidriumId) as UniswapV3HyperLiquidriumConversion

	let price = getExchangeRate(Address.fromString(hyperLiquidrium.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hyperLiquidriumId)

	if (conversion.baseTokenIndex == 0) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		withdraw.amountUSD = (withdraw.amount1.toBigDecimal() * price + withdraw.amount0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		withdraw.amountUSD = (withdraw.amount0.toBigDecimal() * price + withdraw.amount1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is WETH, don't track USD
		withdraw.amountUSD = ZERO_BD
	}
	withdraw.save()

	// Update visor shares
	let visorId = event.params.sender.toHex()
	let hyperLiquidriumShareId = hyperLiquidriumId + "-" + visorId
	let hyperLiquidriumShare = UniswapV3HyperLiquidriumShare.load(hyperLiquidriumShareId)
	if (hyperLiquidriumShare != null) {
		if (hyperLiquidriumShare.shares == withdraw.shares ) {
			// If all shares are withdrawn, remove entity
			store.remove('UniswapV3HyperLiquidriumShare', hyperLiquidriumShareId)
			// let visor = Visor.load(visorId)
			// if (visor != null) {
			// 	visor.hyperLiquidriumCount -= ONE_BI
			// 	visor.save()
			// }
			// hyperLiquidrium.visorCount -= ONE_BI
		} else {
			let remainingShares = hyperLiquidriumShare.shares - withdraw.shares
			hyperLiquidriumShare.initialToken0 = hyperLiquidriumShare.initialToken0 * remainingShares / hyperLiquidriumShare.shares
			hyperLiquidriumShare.initialToken1 = hyperLiquidriumShare.initialToken1 * remainingShares / hyperLiquidriumShare.shares
			hyperLiquidriumShare.initialUSD = hyperLiquidriumShare.initialUSD * remainingShares.toBigDecimal() / hyperLiquidriumShare.shares.toBigDecimal()
			hyperLiquidriumShare.shares -= withdraw.shares
			hyperLiquidriumShare.save()
		}
	}
	
	// Update relevant hyperLiquidrium fields
	hyperLiquidrium.totalSupply -= withdraw.shares
	hyperLiquidrium.save()

	updateTvl(event.address)
	updateAggregates(hyperLiquidriumId)
	
	// Aggregate daily data	
	let hyperLiquidriumDayData = updateAndGetUniswapV3HyperLiquidriumDayData(hyperLiquidriumId)
	hyperLiquidriumDayData.withdrawn0 += withdraw.amount0
    hyperLiquidriumDayData.withdrawn1 += withdraw.amount1
    hyperLiquidriumDayData.withdrawnUSD += withdraw.amountUSD
    hyperLiquidriumDayData.save()
}

export function handleSetDepositMax(call: SetDepositMaxCall): void {
	let hyperLiquidrium = getOrCreateHyperLiquidrium(call.to, call.block.timestamp)
	hyperLiquidrium.deposit0Max = call.inputValues[0].value.toBigInt()
	hyperLiquidrium.deposit1Max = call.inputValues[1].value.toBigInt()
	hyperLiquidrium.save()
}

export function handleSetMaxTotalSupply(call: SetMaxTotalSupplyCall): void {
	let hyperLiquidrium = getOrCreateHyperLiquidrium(call.to, call.block.timestamp)
	hyperLiquidrium.maxTotalSupply = call.inputValues[0].value.toBigInt()
	hyperLiquidrium.save()
}
