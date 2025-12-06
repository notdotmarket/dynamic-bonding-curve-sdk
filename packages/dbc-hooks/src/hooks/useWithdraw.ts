import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Keypair, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useDbcContext } from '../context'
import type { WithdrawParams } from '../types'

interface WithdrawMutationParams extends WithdrawParams {
    wallet: Keypair
    maxBaseAmount?: BN
    maxQuoteAmount?: BN
}

export function useWithdraw() {
    const { client, connection } = useDbcContext()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: WithdrawMutationParams) => {
            const { 
                wallet, 
                pool, 
                type, 
                owner,
                maxBaseAmount = new BN('18446744073709551615'), // Max u64
                maxQuoteAmount = new BN('18446744073709551615'), // Max u64
            } = params

            let withdrawTx

            // Select appropriate withdrawal method based on type
            switch (type) {
                case 'creatorSurplusQuote':
                    withdrawTx = await client.creator.creatorWithdrawSurplus({
                        creator: owner,
                        virtualPool: pool,
                    })
                    break

                case 'partnerSurplusQuote':
                    withdrawTx = await client.partner.partnerWithdrawSurplus({
                        feeClaimer: owner,
                        virtualPool: pool,
                    })
                    break

                case 'partnerSurplusBase':
                    withdrawTx = await client.partner.partnerWithdrawBaseNoMigration({
                        feeClaimer: owner,
                        virtualPool: pool,
                    })
                    break

                case 'creatorTradingFee':
                    withdrawTx = await client.creator.claimCreatorTradingFee({
                        pool,
                        creator: owner,
                        payer: wallet.publicKey,
                        maxBaseAmount,
                        maxQuoteAmount,
                    })
                    break

                case 'partnerTradingFee':
                    withdrawTx = await client.partner.claimPartnerTradingFee({
                        pool,
                        feeClaimer: owner,
                        payer: wallet.publicKey,
                        maxBaseAmount,
                        maxQuoteAmount,
                    })
                    break

                default:
                    throw new Error(`Unknown withdrawal type: ${type}`)
            }

            withdrawTx.feePayer = wallet.publicKey
            withdrawTx.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash

            withdrawTx.sign(wallet)

            // Send transaction
            const signature = await connection.sendRawTransaction(
                withdrawTx.serialize()
            )

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed')

            return {
                signature,
                pool: pool.toBase58(),
                type,
            }
        },
        onSuccess: (data) => {
            // Invalidate fee breakdown queries to refetch updated data
            queryClient.invalidateQueries({
                queryKey: ['fee-breakdown', data.pool],
            })
            queryClient.invalidateQueries({
                queryKey: ['pool-info', data.pool],
            })
        },
    })
}
