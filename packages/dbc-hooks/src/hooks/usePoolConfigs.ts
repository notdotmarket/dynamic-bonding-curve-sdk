import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch all pool configs
 */
export function usePoolConfigs() {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-configs'],
        queryFn: async () => {
            const configs = await client.state.getPoolConfigs()
            return configs
        },
    })
}

/**
 * Hook to fetch pool configs by owner address
 */
export function usePoolConfigsByOwner(owner: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-configs-by-owner', owner?.toString()],
        queryFn: async () => {
            if (!owner) return []
            const configs = await client.state.getPoolConfigsByOwner(owner)
            return configs
        },
        enabled: !!owner,
    })
}
