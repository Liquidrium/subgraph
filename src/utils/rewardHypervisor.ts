import { BigInt } from '@graphprotocol/graph-ts'
import { getOrCreateVisrToken } from './visrToken'
import { ZERO_BI, REWARD_HYPERVISOR_ADDRESS } from './constants'
import { RewardHyperLiquidrium, RewardHyperLiquidriumShare } from "../../generated/schema"


export function getOrCreateRewardHyperLiquidrium(): RewardHyperLiquidrium {
	
	let rhyperLiquidrium = RewardHyperLiquidrium.load(REWARD_HYPERVISOR_ADDRESS)
	if (rhyperLiquidrium == null) {
		rhyperLiquidrium = new RewardHyperLiquidrium(REWARD_HYPERVISOR_ADDRESS)
		rhyperLiquidrium.totalVisr = ZERO_BI
		rhyperLiquidrium.totalSupply = ZERO_BI
		rhyperLiquidrium.save()

		// Reset total staked VISR at this point. To track VISR staked in rewards hyperLiquidrium only
		let visr = getOrCreateVisrToken()
		visr.totalStaked = ZERO_BI
		visr.save()
	}

	return rhyperLiquidrium as RewardHyperLiquidrium
}

export function getOrCreateRewardHyperLiquidriumShare(visorAddress: string): RewardHyperLiquidriumShare {
	
	let id = REWARD_HYPERVISOR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHyperLiquidriumShare.load(id)
	if (vVisrShare == null) {
		vVisrShare = new RewardHyperLiquidriumShare(id)
		vVisrShare.rewardHyperLiquidrium = REWARD_HYPERVISOR_ADDRESS
		vVisrShare.visor = visorAddress
		vVisrShare.shares = ZERO_BI
	}

	return vVisrShare as RewardHyperLiquidriumShare
}

export function decreaseRewardHyperLiquidriumShares(visorAddress: string, shares: BigInt): void {

	let id = REWARD_HYPERVISOR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHyperLiquidriumShare.load(id)
	if (vVisrShare != null) {
		vVisrShare.shares -= shares
		vVisrShare.save()
	}
}
