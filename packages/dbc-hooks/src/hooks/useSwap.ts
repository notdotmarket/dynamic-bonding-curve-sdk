import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Keypair, Transaction } from '@solana/web3.js'
import { useDbcContext } from '../context'
import type { SwapParams } from '../types'

interface SwapMutationParams extends SwapParams {
    wallet: Keypair
}

export function useSwap() {
    const { client, connection } = useDbcContext()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: SwapMutationParams) => {
            const { wallet, referralTokenAccount, ...restParams } = params

            // Create swap transaction
            const swapTx = await client.pool.swap({
                ...restParams,
                referralTokenAccount: referralTokenAccount ?? null,
            })

            swapTx.feePayer = wallet.publicKey
            swapTx.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash

            swapTx.sign(wallet)

            // Send transaction
            const signature = await connection.sendRawTransaction(
                swapTx.serialize()
            )

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed')

            return {
                signature,
                pool: restParams.pool.toBase58(),
            }
        },
        onSuccess: (data) => {
            // Invalidate pool info queries to refetch updated data
            queryClient.invalidateQueries({
                queryKey: ['pool-info', data.pool],
            })
            queryClient.invalidateQueries({
                queryKey: ['fee-breakdown', data.pool],
            })
        },
    })
}
