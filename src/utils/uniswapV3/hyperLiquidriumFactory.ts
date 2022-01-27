import { dataSource } from "@graphprotocol/graph-ts";
import { UniswapV3HyperLiquidriumFactory } from "../../../generated/schema";
import { ZERO_BI, ONE_BI, ZERO_BD } from "../../utils/constants";

export function getOrCreateFactory(
  addressString: string
): UniswapV3HyperLiquidriumFactory {
  let factory = UniswapV3HyperLiquidriumFactory.load(addressString);
  if (factory == null) {
    factory = new UniswapV3HyperLiquidriumFactory(addressString);
    factory.hyperLiquidriumCount = ZERO_BI;
    factory.grossFeesClaimedUSD = ZERO_BD;
    factory.protocolFeesCollectedUSD = ZERO_BD;
    factory.feesReinvestedUSD = ZERO_BD;
    factory.tvlUSD = ZERO_BD;
    factory.save();
  }

  return factory as UniswapV3HyperLiquidriumFactory;
}
