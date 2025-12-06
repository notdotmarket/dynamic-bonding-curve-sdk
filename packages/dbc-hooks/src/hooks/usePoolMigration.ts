import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch pool migration quote threshold
 */
export function usePoolMigrationQuoteThreshold(poolAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-migration-threshold', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return null
            const threshold = await client.state.getPoolMigrationQuoteThreshold(poolAddress)
            return threshold
        },
        enabled: !!poolAddress,
    })
}

/**
 * Hook to fetch DAMM V1 migration metadata
 */
export function useDammV1MigrationMetadata(poolAddress: PublicKey | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['damm-v1-migration-metadata', poolAddress?.toString()],
        queryFn: async () => {
            if (!poolAddress) return null
            const metadata = await client.state.getDammV1MigrationMetadata(poolAddress)
            return metadata
        },
        enabled: !!poolAddress,
    })
}

/**
 * Hook to fetch DAMM V1 lock escrow details
 */
export function useDammV1LockEscrow(lockEscrowAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['damm-v1-lock-escrow', lockEscrowAddress?.toString()],
        queryFn: async () => {
            if (!lockEscrowAddress) return null
            const escrow = await client.state.getDammV1LockEscrow(lockEscrowAddress)
            return escrow
        },
        enabled: !!lockEscrowAddress,
    })
}
