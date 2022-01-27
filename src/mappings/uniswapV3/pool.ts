import { Address } from '@graphprotocol/graph-ts'
import { Swap } from "../../../generated/templates/UniswapV3Pool/UniswapV3Pool"
import { resetAggregates, updateAggregates, updateTvl } from "../../utils/aggregation"
import { updateAndGetUniswapV3HyperLiquidriumDayData } from "../../utils/intervalUpdates"
import { getOrCreatePool } from '../../utils/uniswapV3/pool'

export function handleSwap(event: Swap): void {
	let pool = getOrCreatePool(event.address)
	pool.lastSwapTime = event.block.timestamp
	pool.sqrtPriceX96 = event.params.sqrtPriceX96
	pool.save()

	let hyperLiquidriums = pool.hyperLiquidriums
	for (let i = 0; i < hyperLiquidriums.length; i++) {
		resetAggregates(hyperLiquidriums[i])
		updateTvl(Address.fromString(hyperLiquidriums[i]))
		updateAggregates(hyperLiquidriums[i])
		let hyperLiquidriumDayData = updateAndGetUniswapV3HyperLiquidriumDayData(hyperLiquidriums[i])
		hyperLiquidriumDayData.save()
	}
}
