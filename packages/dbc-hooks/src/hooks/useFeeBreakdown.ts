import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'
import type { FeeBreakdownResult } from '../types'

export function useFeeBreakdown(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery<FeeBreakdownResult>({
        queryKey: ['fee-breakdown', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) throw new Error('Pool address is required')
            
            const poolPubkey = typeof poolAddress === 'string'
                ? new PublicKey(poolAddress)
                : poolAddress

            const feeBreakdown = await client.state.getPoolFeeBreakdown(poolPubkey)

            return feeBreakdown
        },
        enabled: !!poolAddress,
        staleTime: 10_000, // 10 seconds
        refetchInterval: 30_000, // 30 seconds
    })
}
