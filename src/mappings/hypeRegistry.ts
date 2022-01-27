/* eslint-disable prefer-const */
import { HypeAdded } from "../../generated/HypeRegistry/HypeRegistry"
import { UniswapV3HyperLiquidrium as HyperLiquidriumTemplate } from "../../generated/templates"
import { getOrCreateHyperLiquidrium } from "../utils/uniswapV3/hyperLiquidrium"

export function handleHypeAdded(event: HypeAdded): void {

    let hyperLiquidrium = getOrCreateHyperLiquidrium(event.params.hype, event.block.timestamp)
    hyperLiquidrium.save()
    
    HyperLiquidriumTemplate.create(event.params.hype)
}