import BN from 'bn.js'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

export function parseAmount(
    amount: string | number,
    decimals: number
): BN {
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
    return new BN(Math.floor(amountNum * Math.pow(10, decimals)))
}

export function formatAmount(
    amount: BN,
    decimals: number,
    maxDecimals: number = 6
): string {
    const divisor = Math.pow(10, decimals)
    const amountNum = amount.toNumber() / divisor
    return amountNum.toFixed(maxDecimals)
}

export function formatSOL(lamports: BN | number): string {
    const amount =
        lamports instanceof BN ? lamports.toNumber() : lamports
    return (amount / LAMPORTS_PER_SOL).toFixed(4)
}

export function validatePublicKey(address: string): boolean {
    try {
        new PublicKey(address)
        return true
    } catch {
        return false
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
