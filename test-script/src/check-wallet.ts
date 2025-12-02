/**
 * Utility script to check wallet balance and setup
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { initializeWallet } from './walletManager';
import { getConnection } from './config';

async function main() {
    console.log('🔍 Wallet Information\n');
    
    try {
        // Initialize wallet
        const wallet = initializeWallet();
        console.log(`✅ Wallet initialized successfully`);
        console.log(`📍 Address: ${wallet.publicKey.toString()}\n`);
        
        // Get connection
        const connection = getConnection();
        
        // Get balance
        const balance = await connection.getBalance(wallet.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        
        console.log(`💰 Balance: ${solBalance.toFixed(9)} SOL`);
        
        // Check if sufficient
        if (balance < 0.1 * LAMPORTS_PER_SOL) {
            console.log(`\n⚠️  WARNING: Low balance!`);
            console.log(`💡 Airdrop command:`);
            console.log(`   solana airdrop 2 ${wallet.publicKey.toString()} --url devnet\n`);
        } else {
            console.log(`\n✅ Balance sufficient for testing\n`);
        }
        
        // Show airdrop command
        console.log(`📋 Useful Commands:`);
        console.log(`   Airdrop: solana airdrop 2 ${wallet.publicKey.toString()} --url devnet`);
        console.log(`   Check: solana balance ${wallet.publicKey.toString()} --url devnet`);
        
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error('\n💡 Make sure your .env file has SOLANA_PRIVATE_KEY set correctly');
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
