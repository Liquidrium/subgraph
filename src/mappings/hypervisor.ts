/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts'
import { 
	HyperLiquidrium as HyperVisorContract,
	BonusTokenRegistered,
	HyperLiquidriumCreated,
	HyperLiquidriumFunded,
	OwnershipTransferred,
	RewardClaimed,
	Staked,
	Unstaked,
	VaultFactoryRegistered,
	VaultFactoryRemoved
} from "../../generated/HyperLiquidrium/HyperLiquidrium"
import { HyperLiquidrium, RewardedToken } from "../../generated/schema"
import { getOrCreateStakedToken, createRewardedToken } from "../utils/tokens"
import { ADDRESS_ZERO, ZERO_BI } from "../utils/constants"


function getOrCreateStakingHyperLiquidrium(addressString: string): HyperLiquidrium {
	let nullAddress = Address.fromString(ADDRESS_ZERO)
	let hyperLiquidrium = HyperLiquidrium.load(addressString)
	if (hyperLiquidrium == null) {
		hyperLiquidrium = new HyperLiquidrium(addressString)
		hyperLiquidrium.powerSwitch = nullAddress
		hyperLiquidrium.rewardPool = nullAddress
		hyperLiquidrium.rewardPoolAmount = ZERO_BI
		hyperLiquidrium.stakingToken = ADDRESS_ZERO
		hyperLiquidrium.totalStakedAmount = ZERO_BI
		hyperLiquidrium.rewardToken = ADDRESS_ZERO
	}

	return hyperLiquidrium as HyperLiquidrium
}

export function handleBonusTokenRegistered(event: BonusTokenRegistered): void {
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	let bonusTokens = hyperLiquidrium.bonusTokens
	if (bonusTokens != null) {
		bonusTokens.push(event.params.token)
		hyperLiquidrium.bonusTokens = bonusTokens
	}
	hyperLiquidrium.save()
}

export function handleHyperLiquidriumCreated(event: HyperLiquidriumCreated): void {
	// OwnershipTransferred event always emited before HyperLiquidriumCreated, so it's safe to load
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.powerSwitch = event.params.powerSwitch
	hyperLiquidrium.rewardPool = event.params.rewardPool
	hyperLiquidrium.rewardPoolAmount = ZERO_BI

	let hyperLiquidriumContract = HyperVisorContract.bind(event.address)
	let callResults = hyperLiquidriumContract.getHyperLiquidriumData()
	hyperLiquidrium.stakingToken = callResults.stakingToken.toHexString()
	hyperLiquidrium.totalStakedAmount = ZERO_BI
	hyperLiquidrium.rewardToken = callResults.rewardToken.toHexString()
	hyperLiquidrium.save()
}

export function handleHyperLiquidriumFunded(event: HyperLiquidriumFunded): void {
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.rewardPoolAmount += event.params.amount
	hyperLiquidrium.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	let to = event.address.toHex()
	let hyperLiquidrium = HyperLiquidrium.load(to)
	if (hyperLiquidrium == null) {
		hyperLiquidrium = new HyperLiquidrium(to)
	}
	hyperLiquidrium.owner = event.params.newOwner
	hyperLiquidrium.save()
}

export function handleRewardClaimed(event: RewardClaimed): void {
	// there is both reward token and bonus token
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	if (event.params.token.toHex() == hyperLiquidrium.rewardToken) {
		hyperLiquidrium.rewardPoolAmount -= event.params.amount
	}
	hyperLiquidrium.save()

	let rewardedToken = RewardedToken.load(event.params.vault.toHexString() + "-" + hyperLiquidrium.rewardToken)
	if (rewardedToken == null) {
		rewardedToken = createRewardedToken(event.params.vault, Address.fromString(hyperLiquidrium.rewardToken))
	}
	rewardedToken.amount += event.params.amount
	rewardedToken.save()
}

export function handleStaked(event: Staked): void {
	// Add data to visor instance - amount staked
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.totalStakedAmount += event.params.amount
	hyperLiquidrium.save()

	let stakedToken = getOrCreateStakedToken(event.params.vault, Address.fromString(hyperLiquidrium.stakingToken))
	stakedToken.amount += event.params.amount
	stakedToken.save()
}

export function handleUnstaked(event: Unstaked): void {
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.totalStakedAmount -= event.params.amount
	hyperLiquidrium.save()

	let stakedToken = getOrCreateStakedToken(event.params.vault, Address.fromString(hyperLiquidrium.stakingToken))
	stakedToken.amount -= event.params.amount
	stakedToken.save()
}

export function handleVaultFactoryRegistered(event: VaultFactoryRegistered): void {
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.vaultFactory = event.params.factory.toHex()
	hyperLiquidrium.save()
}

export function handleVaultFactoryRemoved(event: VaultFactoryRemoved): void {
	let hyperLiquidrium = getOrCreateStakingHyperLiquidrium(event.address.toHex())
	hyperLiquidrium.vaultFactory = null
	hyperLiquidrium.save()
}
