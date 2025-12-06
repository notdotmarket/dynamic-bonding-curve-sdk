import { useQuery } from '@tanstack/react-query'
import BN from 'bn.js'
import { useDbcContext } from '../context'
import type { SwapQuote2Params } from '../types'
import { SwapMode } from '../types'

/**
 * Hook to get a swap quote using swapQuote2 (v2) - supports ExactIn, ExactOut, and PartialFill modes
 * This is a read-only operation that calculates the swap output
 * 
 * @example ExactIn mode (specify input amount):
 * const { data } = useSwapQuote2({
 *   poolAddress,
 *   swapBaseForQuote: false,
 *   swapMode: SwapMode.ExactIn,
 *   amountIn: new BN(1000000),
 *   slippageBps: 100,
 * })
 * 
 * @example ExactOut mode (specify desired output amount):
 * const { data } = useSwapQuote2({
 *   poolAddress,
 *   swapBaseForQuote: false,
 *   swapMode: SwapMode.ExactOut,
 *   amountOut: new BN(1000000),
 *   slippageBps: 100,
 * })
 * 
 * @example PartialFill mode (allows partial fills):
 * const { data } = useSwapQuote2({
 *   poolAddress,
 *   swapBaseForQuote: false,
 *   swapMode: SwapMode.PartialFill,
 *   amountIn: new BN(1000000),
 *   slippageBps: 100,
 * })
 */
export function useSwapQuote2(params: SwapQuote2Params | null) {
    const { client } = useDbcContext()

    const queryKey = [
        'swap-quote-2',
        params?.poolAddress?.toString(),
        params?.swapBaseForQuote,
        params?.slippageBps,
        params?.hasReferral,
    ]

    // Add mode-specific parameters to query key
    if (params) {
        if ('amountIn' in params) {
            queryKey.push(params.swapMode.toString(), params.amountIn.toString())
        } else if ('amountOut' in params) {
            queryKey.push(params.swapMode.toString(), params.amountOut.toString())
        }
    }

    return useQuery({
        queryKey,
        queryFn: async () => {
            if (!params) throw new Error('Swap params are required')

            // Fetch pool and config data
            const pool = await client.state.getPool(params.poolAddress)
            const config = await client.state.getPoolConfig(pool.config)

            // Calculate swap quote using SDK's read function with proper mode
            const quote = client.pool.swapQuote2({
                virtualPool: pool,
                config: config,
                swapBaseForQuote: params.swapBaseForQuote,
                swapMode: params.swapMode,
                slippageBps: params.slippageBps ?? 100, // 1% default
                hasReferral: params.hasReferral ?? false,
                currentPoint: new BN(Date.now()),
                ...(params.swapMode === SwapMode.ExactOut
                    ? { amountOut: (params as any).amountOut }
                    : { amountIn: (params as any).amountIn }),
            } as any)

            return {
                ...quote,
                pool,
                config,
                swapMode: params.swapMode,
            }
        },
        enabled:
            !!params &&
            !!params.poolAddress &&
            (('amountIn' in params && !!params.amountIn) ||
                ('amountOut' in params && !!params.amountOut)),
        staleTime: 5_000, // 5 seconds
        refetchInterval: 10_000, // 10 seconds
    })
}
