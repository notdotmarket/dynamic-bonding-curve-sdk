import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch pool curve progress (ratio of current quote reserve to migration threshold)
 * Returns a value between 0 and 1
 */
export function usePoolCurveProgress(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-curve-progress', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return 0
            const progress = await client.state.getPoolCurveProgress(poolAddress)
            return progress
        },
        enabled: !!poolAddress,
    })
}
