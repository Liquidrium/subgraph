/* eslint-disable prefer-const */
import { dataSource, ethereum } from '@graphprotocol/graph-ts'
// import { UniswapV3HyperLiquidrium as HyperLiquidriumTemplate } from "../../../generated/templates/UniswapV3HyperLiquidrium/UniswapV3HyperLiquidrium"
import { getOrCreateHyperLiquidrium } from "../../utils/uniswapV3/hyperLiquidrium"
import { getOrCreateFactory } from "../../utils/uniswapV3/hyperLiquidriumFactory"
import { ADDRESS_ZERO } from '../../utils/constants'

//HyperLiquidriums that were created with invalid parameters and should not be indexed
// let INVALID_HYPERVISORS: Array<Address> = [
//     Address.fromString('0xce721b5dc9624548188b5451bb95989a7927080a'),  // CRV
//     Address.fromString('0x0e9e16f6291ba2aaaf41ccffdf19d32ab3691d15'),  // MATIC
//     Address.fromString('0x95b801f9bf7c49b383e36924c2ce176be3027d66'),  // Incorrect TCR
//     Address.fromString('0x8172b894639f51e58f76baee0c24eac574e52528')   // Another TCR one
// ]

export function handleHyperLiquidriumCall(block: ethereum.Block): void {

    // if (INVALID_HYPERVISORS.includes(event.params.hyperLiquidrium)) return;

    let factory = getOrCreateFactory(ADDRESS_ZERO)
    factory.save()

    let hyperLiquidrium = getOrCreateHyperLiquidrium(dataSource.address(), block.timestamp)
    hyperLiquidrium.factory = ADDRESS_ZERO
    hyperLiquidrium.save()
    
    // HyperLiquidriumTemplate.create(event.params.hyperLiquidrium)
}
