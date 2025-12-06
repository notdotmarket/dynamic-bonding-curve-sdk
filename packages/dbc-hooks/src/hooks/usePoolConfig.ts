import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

export function usePoolConfig(configAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['pool-config', configAddress?.toString()],
        queryFn: async () => {
            if (!configAddress) throw new Error('Config address is required')
            
            const configPubkey = typeof configAddress === 'string'
                ? new PublicKey(configAddress)
                : configAddress

            return await client.state.getPoolConfig(configPubkey)
        },
        enabled: !!configAddress,
        staleTime: 60_000, // 1 minute (configs rarely change)
    })
}
