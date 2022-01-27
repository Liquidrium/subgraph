/* eslint-disable prefer-const */
import { ethereum, BigInt } from '@graphprotocol/graph-ts'
import {
    // EthDayData,
    // VisrTokenDayData,
    UniswapV3HyperLiquidriumDayData,
    UniswapV3HyperLiquidrium 
} from '../../generated/schema'
// import { getOrCreateVisrToken } from './visrToken'
// import { getVisrRateInUSDC } from './pricing'
import { ZERO_BI, ZERO_BD } from './constants'

let SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
let SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24)


// export function getEthDayData(event: ethereum.Event, utcDiffHours: BigInt): EthDayData {
//     let timestamp = event.block.timestamp
//     let utcDiffSeconds = utcDiffHours * SECONDS_IN_HOUR
//     let timezone = (utcDiffHours == ZERO_BI) ? 'UTC' : "UTC" + utcDiffHours.toString() 

//     let dayNumber = (timestamp + utcDiffSeconds) / SECONDS_IN_DAY
//     let dayStartTimestamp = dayNumber * SECONDS_IN_DAY - utcDiffSeconds
//     let dayId = timezone + '-' + dayNumber.toString()

//     let ethDayData = EthDayData.load(dayId)
//     if (ethDayData == null) {
//         ethDayData = new EthDayData(dayId)
//         ethDayData.date = dayStartTimestamp
//         ethDayData.timezone = timezone
//         ethDayData.distributed = ZERO_BI
//         ethDayData.distributedUSD = ZERO_BD
//     }

//     return ethDayData as EthDayData
// }

// export function updateVisrTokenDayData(distributed: BigInt, timestamp: BigInt, utcDiffHours: BigInt): VisrTokenDayData {
//     let utcDiffSeconds = utcDiffHours * SECONDS_IN_HOUR
//     let timezone = (utcDiffHours == ZERO_BI) ? 'UTC' : "UTC" + utcDiffHours.toString() 

//     let dayNumber = (timestamp + utcDiffSeconds) / SECONDS_IN_DAY
//     let dayStartTimestamp = dayNumber * SECONDS_IN_DAY - utcDiffSeconds
//     let dayId = timezone + '-' + dayNumber.toString()

//     let visrDayData = VisrTokenDayData.load(dayId)
//     if (visrDayData == null) {
//         visrDayData = new VisrTokenDayData(dayId)
//         visrDayData.date = dayStartTimestamp
//         visrDayData.timezone = timezone
//         visrDayData.distributed = ZERO_BI
//         visrDayData.distributedUSD = ZERO_BD
//     }

//     let visrRate = getVisrRateInUSDC()
//     let visr = getOrCreateVisrToken()

//     visrDayData.totalStaked = visr.totalStaked
//     visrDayData.distributed += distributed
//     visrDayData.distributedUSD += distributed.toBigDecimal() * visrRate
//     visrDayData.save()

//     return visrDayData as VisrTokenDayData
// }


export function updateAndGetUniswapV3HyperLiquidriumDayData(hyperLiquidriumAddress: string): UniswapV3HyperLiquidriumDayData {
    let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumAddress) as UniswapV3HyperLiquidrium
    // hyperLiquidriumDayData.adjustedFeesReinvestedUSD = hyperLiquidrium.adjustedFeesReinvestedUSD
    
    let hyperLiquidriumDayDataUTC = getOrCreateHyperLiquidriumDayData(hyperLiquidriumAddress, ZERO_BI)
    hyperLiquidriumDayDataUTC.totalSupply = hyperLiquidrium.totalSupply
    hyperLiquidriumDayDataUTC.tvl0 = hyperLiquidrium.tvl0
    hyperLiquidriumDayDataUTC.tvl1 = hyperLiquidrium.tvl1
    hyperLiquidriumDayDataUTC.tvlUSD = hyperLiquidrium.tvlUSD
    hyperLiquidriumDayDataUTC.close = hyperLiquidrium.pricePerShare

    if (hyperLiquidrium.pricePerShare > hyperLiquidriumDayDataUTC.high) {
        hyperLiquidriumDayDataUTC.high = hyperLiquidrium.pricePerShare
    } else if (hyperLiquidrium.pricePerShare < hyperLiquidriumDayDataUTC.low) {
        hyperLiquidriumDayDataUTC.low = hyperLiquidrium.pricePerShare
    }

    return hyperLiquidriumDayDataUTC as UniswapV3HyperLiquidriumDayData
}


function getOrCreateHyperLiquidriumDayData(hyperLiquidriumAddress: string, utcDiffHours: BigInt): UniswapV3HyperLiquidriumDayData {
    let hyperLiquidrium = UniswapV3HyperLiquidrium.load(hyperLiquidriumAddress) as UniswapV3HyperLiquidrium

    let utcDiffSeconds = utcDiffHours * SECONDS_IN_HOUR
    let timezone = (utcDiffHours == ZERO_BI) ? 'UTC' : "UTC" + utcDiffHours.toString() 

    let dayNumber = (hyperLiquidrium.lastUpdated + utcDiffSeconds) / SECONDS_IN_DAY
    let dayStartTimestamp = dayNumber * SECONDS_IN_DAY - utcDiffSeconds

    let dayHyperLiquidriumId = hyperLiquidriumAddress + '-' + timezone + '-' + dayNumber.toString()
    let hyperLiquidriumDayData = UniswapV3HyperLiquidriumDayData.load(dayHyperLiquidriumId)
    if (hyperLiquidriumDayData === null) {
        hyperLiquidriumDayData = new UniswapV3HyperLiquidriumDayData(dayHyperLiquidriumId)
        hyperLiquidriumDayData.date = dayStartTimestamp
        hyperLiquidriumDayData.hyperLiquidrium = hyperLiquidriumAddress
        hyperLiquidriumDayData.deposited0 = ZERO_BI
        hyperLiquidriumDayData.deposited1 = ZERO_BI
        hyperLiquidriumDayData.depositedUSD = ZERO_BD
        hyperLiquidriumDayData.withdrawn0 = ZERO_BI
        hyperLiquidriumDayData.withdrawn1 = ZERO_BI
        hyperLiquidriumDayData.withdrawnUSD = ZERO_BD
        hyperLiquidriumDayData.grossFeesClaimed0 = ZERO_BI
        hyperLiquidriumDayData.grossFeesClaimed1 = ZERO_BI
        hyperLiquidriumDayData.grossFeesClaimedUSD = ZERO_BD
        hyperLiquidriumDayData.protocolFeesCollected0 = ZERO_BI
        hyperLiquidriumDayData.protocolFeesCollected1 = ZERO_BI
        hyperLiquidriumDayData.protocolFeesCollectedUSD = ZERO_BD
        hyperLiquidriumDayData.feesReinvested0 = ZERO_BI
        hyperLiquidriumDayData.feesReinvested1 = ZERO_BI
        hyperLiquidriumDayData.feesReinvestedUSD = ZERO_BD
        hyperLiquidriumDayData.totalSupply = ZERO_BI
        hyperLiquidriumDayData.tvl0 = ZERO_BI
        hyperLiquidriumDayData.tvl1 = ZERO_BI
        hyperLiquidriumDayData.tvlUSD = ZERO_BD
        hyperLiquidriumDayData.open = hyperLiquidrium.pricePerShare
        hyperLiquidriumDayData.close = hyperLiquidrium.pricePerShare
        hyperLiquidriumDayData.low = hyperLiquidrium.pricePerShare
        hyperLiquidriumDayData.high = hyperLiquidrium.pricePerShare
    }

    return hyperLiquidriumDayData as UniswapV3HyperLiquidriumDayData
}
