import { Connection, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';

/**
 * Configuration for the test scripts
 */
export const CONFIG = {
    // Solana connection
    RPC_URL: 'https://api.devnet.solana.com',
    COMMITMENT: 'confirmed' as const,
    
    // Quote mint (SOL for devnet testing)
    QUOTE_MINT: NATIVE_MINT,
    
    // Token configuration
    TOKEN: {
        TOTAL_SUPPLY: 1_000_000_000, // 1 billion tokens
        INITIAL_MARKET_CAP: 5000, // $5000 USD
        MIGRATION_MARKET_CAP: 1_000_000, // $1M USD
        NAME: 'Test Token',
        SYMBOL: 'TEST',
        DECIMALS: 6,
    },
    
    // Trading configuration
    TRADING: {
        BUY_AMOUNT_SOL: 0.1, // 0.1 SOL
        SLIPPAGE_BPS: 500, // 5% slippage
    },
    
    // Fee configuration
    FEE: {
        STARTING_FEE_BPS: 100, // 1%
        ENDING_FEE_BPS: 100, // 1%
        CREATOR_TRADING_FEE_PERCENTAGE: 50, // 50% to creator, 50% to partner
    },
} as const;

/**
 * Get connection instance
 */
export function getConnection(): Connection {
    return new Connection(CONFIG.RPC_URL, CONFIG.COMMITMENT);
}

/**
 * Display amounts in human-readable format
 */
export function displayAmount(amount: bigint | number, decimals: number = 9): string {
    const value = typeof amount === 'bigint' ? Number(amount) : amount;
    return (value / Math.pow(10, decimals)).toFixed(decimals);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Confirm transaction with retries
 */
export async function confirmTransaction(
    connection: Connection,
    signature: string,
    maxRetries: number = 30
): Promise<void> {
    console.log(`🔄 Confirming transaction: ${signature}`);
    
    for (let i = 0; i < maxRetries; i++) {
        const status = await connection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction confirmed!`);
            return;
        }
        
        if (status.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        
        await sleep(1000);
    }
    
    throw new Error('Transaction confirmation timeout');
}
