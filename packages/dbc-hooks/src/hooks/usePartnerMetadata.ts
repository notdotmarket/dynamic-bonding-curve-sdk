import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useDbcContext } from '../context'

/**
 * Hook to fetch partner metadata
 */
export function usePartnerMetadata(partnerAddress: PublicKey | string | null) {
    const { client } = useDbcContext()

    return useQuery({
        queryKey: ['partner-metadata', partnerAddress?.toString()],
        queryFn: async () => {
            if (!partnerAddress) return []
            const metadata = await client.state.getPartnerMetadata(partnerAddress)
            return metadata
        },
        enabled: !!partnerAddress,
    })
}
