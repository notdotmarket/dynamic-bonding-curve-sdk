import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useDbcContext } from '../context'
import type { SwapQuoteParams } from '../types'

/**
 * Hook to get a swap quote using swapQuote (v1) - for exact input swaps
 * This is a read-only operation that calculates the swap output
 */
export function useSwapQuote(params: SwapQuoteParams | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: [
            'swap-quote',
            params?.poolAddress?.toString(),
            params?.amountIn?.toString(),
            params?.swapBaseForQuote,
            params?.slippageBps,
            params?.hasReferral,
        ],
        queryFn: async () => {
            if (!params) throw new Error('Swap params are required')

            // Fetch pool and config data
            const pool = await client.state.getPool(params.poolAddress)
            const config = await client.state.getPoolConfig(pool.config)

            // Calculate swap quote using SDK's read function
            const quote = client.pool.swapQuote({
                virtualPool: pool,
                config: config,
                swapBaseForQuote: params.swapBaseForQuote,
                amountIn: params.amountIn,
                slippageBps: params.slippageBps ?? 100, // 1% default
                hasReferral: params.hasReferral ?? false,
                currentPoint: new BN(Date.now()),
            })

            return {
                ...quote,
                pool,
                config,
            }
        },
        enabled: !!params && !!params.poolAddress && !!params.amountIn,
        staleTime: 5_000, // 5 seconds
        refetchInterval: 10_000, // 10 seconds
    })
}
