import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch pool metadata
 */
export function usePoolMetadata(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-metadata', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return []
            const metadata = await client.state.getPoolMetadata(poolAddress)
            return metadata
        },
        enabled: !!poolAddress,
    })
}
