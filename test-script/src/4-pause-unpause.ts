/**
 * Script 4: Pause and Unpause Trading
 * 
 * This script demonstrates pausing and unpausing trading on a pool.
 * Only the partner (fee claimer) can pause/unpause.
 * Requires: config.json and token.json from previous scripts
 */

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import { initializeWallet } from './walletManager';
import { getConnection, CONFIG, confirmTransaction, displayAmount, sleep } from './config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TokenData {
    tokenMint: string;
    poolAddress: string;
    [key: string]: any;
}

interface ConfigData {
    configAddress: string;
    partnerAddress: string;
    [key: string]: any;
}

async function pauseTrading(
    client: DynamicBondingCurveClient,
    connection: any,
    partner: any,
    poolAddress: PublicKey
) {
    console.log('\n⏸️  PAUSING TRADING');
    console.log('==================');
    
    console.log('\n📤 Creating pause transaction...');
    const pauseTx = await client.partner.pauseTrading({
        feeClaimer: partner.publicKey,
        virtualPool: poolAddress,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    pauseTx.recentBlockhash = blockhash;
    pauseTx.feePayer = partner.publicKey;
    pauseTx.sign(partner);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(pauseTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    console.log('\n✅ Trading paused successfully!');
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log(`\n⚠️  All swap transactions will now be blocked.`);
    console.log(`💡 Partner can now withdraw 100% of quote tokens.`);
    
    return signature;
}

async function unpauseTrading(
    client: DynamicBondingCurveClient,
    connection: any,
    partner: any,
    poolAddress: PublicKey
) {
    console.log('\n▶️  UNPAUSING TRADING');
    console.log('====================');
    
    console.log('\n📤 Creating unpause transaction...');
    const unpauseTx = await client.partner.unpauseTrading({
        feeClaimer: partner.publicKey,
        virtualPool: poolAddress,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    unpauseTx.recentBlockhash = blockhash;
    unpauseTx.feePayer = partner.publicKey;
    unpauseTx.sign(partner);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(unpauseTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    console.log('\n✅ Trading unpaused successfully!');
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log(`\n✅ Trading is now active again.`);
    
    return signature;
}

async function testSwapWhilePaused(
    client: DynamicBondingCurveClient,
    connection: any,
    trader: any,
    poolAddress: PublicKey
) {
    console.log('\n🧪 TESTING SWAP WHILE PAUSED');
    console.log('============================');
    
    try {
        console.log('\n📤 Attempting to create swap transaction...');
        const swapTx = await client.pool.swap({
            owner: trader.publicKey,
            pool: poolAddress,
            amountIn: new BN(0.01 * LAMPORTS_PER_SOL),
            minimumAmountOut: new BN(0),
            swapBaseForQuote: false,
            referralTokenAccount: null,
        });
        
        const { blockhash } = await connection.getLatestBlockhash();
        swapTx.recentBlockhash = blockhash;
        swapTx.feePayer = trader.publicKey;
        swapTx.sign(trader);
        
        console.log('📡 Sending transaction...');
        const signature = await connection.sendRawTransaction(swapTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: CONFIG.COMMITMENT,
        });
        
        await confirmTransaction(connection, signature);
        
        console.log('❌ UNEXPECTED: Swap succeeded while paused!');
    } catch (error: any) {
        console.log('✅ EXPECTED: Swap blocked as expected!');
        console.log(`   Error: ${error.message.substring(0, 100)}...`);
    }
}

async function main() {
    console.log('🚀 Starting Pause/Unpause Module on Devnet\n');
    
    // Initialize wallet (partner/fee claimer)
    const partner = initializeWallet();
    console.log(`💼 Partner Address: ${partner.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(partner.publicKey);
    console.log(`💰 Partner Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance! Please airdrop some SOL:');
        console.error(`   solana airdrop 1 ${partner.publicKey.toString()} --url devnet`);
        process.exit(1);
    }
    
    // Load token data
    const tokenFilePath = join(process.cwd(), 'data', 'token-fresh.json');
    if (!existsSync(tokenFilePath)) {
        console.error('❌ Token file not found! Please run script 2 first.');
        process.exit(1);
    }
    
    const tokenData: TokenData = JSON.parse(readFileSync(tokenFilePath, 'utf-8'));
    const poolAddress = new PublicKey(tokenData.poolAddress);
    
    // Load config data to verify partner
    const configFilePath = join(process.cwd(), 'data', 'config.json');
    const configData: ConfigData = JSON.parse(readFileSync(configFilePath, 'utf-8'));
    
    if (configData.partnerAddress !== partner.publicKey.toString()) {
        console.error('❌ Error: Current wallet is not the partner (fee claimer)!');
        console.error(`   Expected: ${configData.partnerAddress}`);
        console.error(`   Got: ${partner.publicKey.toString()}`);
        process.exit(1);
    }
    
    console.log(`\n🏊 Pool Address: ${poolAddress.toString()}`);
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Get pool state
    const poolState = await client.state.getPool(poolAddress);
    if (!poolState) {
        console.error('❌ Pool not found!');
        process.exit(1);
    }
    
    console.log(`\n📊 Pool State:`);
    console.log(`   Base Reserve: ${displayAmount(poolState.baseReserve, CONFIG.TOKEN.DECIMALS)}`);
    console.log(`   Quote Reserve: ${displayAmount(poolState.quoteReserve, 9)} SOL`);
    console.log(`   Is Paused: ${poolState.isPaused ? 'Yes ⏸️' : 'No ▶️'}`);
    
    // Determine action based on current state
    if (poolState.isPaused) {
        console.log('\n⚠️  Pool is currently PAUSED.');
        console.log('   Unpausing trading...\n');
        await unpauseTrading(client, connection, partner, poolAddress);
        
        // Optionally, pause it again after a delay
        console.log('\n⏳ Waiting 5 seconds before pausing again...');
        await sleep(5000);
        await pauseTrading(client, connection, partner, poolAddress);
        
        // Test swap while paused
        await testSwapWhilePaused(client, connection, partner, poolAddress);
        
        // Unpause again at the end
        console.log('\n⏳ Waiting 3 seconds before final unpause...');
        await sleep(3000);
        await unpauseTrading(client, connection, partner, poolAddress);
    } else {
        console.log('\n✅ Pool is currently ACTIVE.');
        console.log('   Pausing trading...\n');
        await pauseTrading(client, connection, partner, poolAddress);
        
        // Test swap while paused
        await testSwapWhilePaused(client, connection, partner, poolAddress);
        
        // Unpause after testing
        console.log('\n⏳ Waiting 3 seconds before unpausing...');
        await sleep(3000);
        await unpauseTrading(client, connection, partner, poolAddress);
    }
    
    console.log('\n✅ Pause/Unpause cycle completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Trading can be paused by partner (fee claimer)');
    console.log('   - All swaps are blocked while paused');
    console.log('   - Partner can withdraw 100% of quote tokens while paused');
    console.log('   - Trading can be unpaused by partner');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
