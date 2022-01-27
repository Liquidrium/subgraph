/* eslint-disable prefer-const */
import { Address, } from '@graphprotocol/graph-ts'
import { ADDRESS_ZERO } from '../utils/constants'
import { Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { 
	getOrCreateRewardHyperLiquidrium,
	getOrCreateRewardHyperLiquidriumShare,
	decreaseRewardHyperLiquidriumShares
} from '../utils/rewardHyperLiquidrium'

export function handleTransfer(event: TransferEvent): void {
	let vVisr = getOrCreateRewardHyperLiquidrium()
	let shares = event.params.value

	if (event.params.from == Address.fromString(ADDRESS_ZERO)) {
		// Mint shares
		let vVisrShare = getOrCreateRewardHyperLiquidriumShare(event.params.to.toHex())
		vVisrShare.shares += shares
		vVisr.totalSupply += shares

		vVisrShare.save()
		vVisr.save()
	} else if (event.params.to == Address.fromString(ADDRESS_ZERO)) {
		// Burn shares
		decreaseRewardHyperLiquidriumShares(event.params.from.toHex(), shares)
		vVisr.totalSupply -= shares
		vVisr.save()
	}
}
