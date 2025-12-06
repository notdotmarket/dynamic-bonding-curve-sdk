import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch all dynamic bonding curve pools
 */
export function usePools() {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pools'],
        queryFn: async () => {
            const pools = await client.state.getPools()
            return pools
        },
    })
}

/**
 * Hook to fetch pools by config address
 */
export function usePoolsByConfig(configAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pools-by-config', configAddress?.toString()],
        queryFn: async () => {
            if (!configAddress) return []
            const pools = await client.state.getPoolsByConfig(configAddress)
            return pools
        },
        enabled: !!configAddress,
    })
}

/**
 * Hook to fetch pools by creator address
 */
export function usePoolsByCreator(creatorAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pools-by-creator', creatorAddress?.toString()],
        queryFn: async () => {
            if (!creatorAddress) return []
            const pools = await client.state.getPoolsByCreator(creatorAddress)
            return pools
        },
        enabled: !!creatorAddress,
    })
}

/**
 * Hook to fetch pool by base mint
 */
export function usePoolByBaseMint(baseMint: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-by-base-mint', baseMint?.toString()],
        queryFn: async () => {
            if (!baseMint) return null
            const pool = await client.state.getPoolByBaseMint(baseMint)
            return pool
        },
        enabled: !!baseMint,
    })
}
