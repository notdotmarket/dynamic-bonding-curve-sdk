import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch pool fee metrics (current unclaimed and total fees)
 */
export function usePoolFeeMetrics(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-fee-metrics', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return null
            const metrics = await client.state.getPoolFeeMetrics(poolAddress)
            return metrics
        },
        enabled: !!poolAddress,
    })
}

/**
 * Hook to fetch detailed fee breakdown for a pool (claimed and unclaimed fees for creator and partner)
 */
export function usePoolFeeBreakdown(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-fee-breakdown', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return null
            const breakdown = await client.state.getPoolFeeBreakdown(poolAddress)
            return breakdown
        },
        enabled: !!poolAddress,
    })
}

/**
 * Hook to fetch fees for all pools linked to a specific config
 */
export function usePoolsFeesByConfig(configAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pools-fees-by-config', configAddress?.toString()],
        queryFn: async () => {
            if (!configAddress) return []
            const fees = await client.state.getPoolsFeesByConfig(configAddress)
            return fees
        },
        enabled: !!configAddress,
    })
}

/**
 * Hook to fetch fees for all pools linked to a specific creator
 */
export function usePoolsFeesByCreator(creatorAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pools-fees-by-creator', creatorAddress?.toString()],
        queryFn: async () => {
            if (!creatorAddress) return []
            const fees = await client.state.getPoolsFeesByCreator(creatorAddress)
            return fees
        },
        enabled: !!creatorAddress,
    })
}
