import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'
import type { PoolInfoResult } from '../types'

export function usePoolInfo(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery<PoolInfoResult>({
        queryKey: ['pool-info', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) throw new Error('Pool address is required')
            
            const poolPubkey = typeof poolAddress === 'string' 
                ? new PublicKey(poolAddress) 
                : poolAddress

            const pool = await client.state.getPool(poolPubkey)
            const config = await client.state.getPoolConfig(pool.config)

            return { pool, config }
        },
        enabled: !!poolAddress,
        staleTime: 10_000, // 10 seconds
        refetchInterval: 30_000, // 30 seconds
    })
}
