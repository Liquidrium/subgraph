import { Address, BigInt } from '@graphprotocol/graph-ts'
import { UniswapV3HyperLiquidrium as HyperLiquidriumContract } from "../../generated/UniswapV3HyperLiquidrium1/UniswapV3HyperLiquidrium"
import { 
	UniswapV3HyperLiquidriumFactory,
	UniswapV3HyperLiquidrium,
	UniswapV3Pool,
	UniswapV3HyperLiquidriumConversion } from "../../generated/schema"
import { getOrCreateFactory } from "../utils/uniswapV3/hyperLiquidriumFactory"
import { getOrCreateHyperLiquidrium } from '../utils/uniswapV3/hyperLiquidrium'
import { getExchangeRate, getBaseTokenRateInUSDC } from "../utils/pricing"
import { ZERO_BI, ZERO_BD } from './constants'


export function resetAggregates(hyperLiquidriumAddress: string): void {
	// Resets aggregates in factory
	let hyperLiquidrium = getOrCreateHyperLiquidrium(Address.fromString(hyperLiquidriumAddress), BigInt.fromI32(0))
	let factory = getOrCreateFactory(hyperLiquidrium.factory)
	factory.grossFeesClaimedUSD -= hyperLiquidrium.grossFeesClaimedUSD
	factory.protocolFeesCollectedUSD -= hyperLiquidrium.protocolFeesCollectedUSD
	factory.feesReinvestedUSD -= hyperLiquidrium.feesReinvestedUSD
	factory.tvlUSD -= hyperLiquidrium.tvlUSD
	factory.save()
}

export function updateAggregates(hyperLiquidriumAddress: string): void {
	// update aggregates in factory from hyperLiquidrium
	let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumAddress) as UniswapV3HyperLiquidrium
	let factory = UniswapV3HyperLiquidriumFactory.load(hyperLiquidrium.factory) as UniswapV3HyperLiquidriumFactory
	factory.grossFeesClaimedUSD += hyperLiquidrium.grossFeesClaimedUSD
	factory.protocolFeesCollectedUSD += hyperLiquidrium.protocolFeesCollectedUSD
	factory.feesReinvestedUSD += hyperLiquidrium.feesReinvestedUSD
	factory.tvlUSD += hyperLiquidrium.tvlUSD
	factory.save()
}
	

export function updateTvl(hyperLiquidriumAddress: Address): void {
	let hyperLiquidriumId = hyperLiquidriumAddress.toHex()
	let contract = HyperLiquidriumContract.bind(hyperLiquidriumAddress)
	let totalAmounts = contract.getTotalAmounts()
	let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumId) as UniswapV3HyperLiquidrium
	let conversion = UniswapV3HyperLiquidriumConversion.load(hyperLiquidriumId) as UniswapV3HyperLiquidriumConversion
	
	hyperLiquidrium.tvl0 = totalAmounts.value0
	hyperLiquidrium.tvl1 = totalAmounts.value1

	let pool = UniswapV3Pool.load(hyperLiquidrium.pool) as UniswapV3Pool
	let price = getExchangeRate(Address.fromString(hyperLiquidrium.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hyperLiquidriumId)

	conversion.priceTokenInBase = price
	conversion.priceBaseInUSD = baseTokenInUSDC
	conversion.save()

	if (conversion.baseTokenIndex == 0) {
		// If token0 is base token, then we convert token1 to the base token
		hyperLiquidrium.tvlUSD = (hyperLiquidrium.tvl1.toBigDecimal() * price + hyperLiquidrium.tvl0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is base token, then we convert token0 to the base token
		hyperLiquidrium.tvlUSD = (hyperLiquidrium.tvl0.toBigDecimal() * price + hyperLiquidrium.tvl1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is a base token, don't track USD
		hyperLiquidrium.tvlUSD = ZERO_BD
	}

	// Update pricePerShare
	hyperLiquidrium.totalSupply = contract.totalSupply()
	if (hyperLiquidrium.totalSupply > ZERO_BI) {
		hyperLiquidrium.pricePerShare = hyperLiquidrium.tvlUSD / hyperLiquidrium.totalSupply.toBigDecimal()
	} else {
		// Case where totalSupply is zero because all liquidity is withdrawn.
		// In this case we need to reset pricePerShare to 0
		hyperLiquidrium.pricePerShare = ZERO_BD
	}

	hyperLiquidrium.lastUpdated = pool.lastSwapTime
	hyperLiquidrium.save()
}
