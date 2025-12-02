/**
 * Script 5: Creator Withdraw Surplus
 * 
 * This script demonstrates creator withdrawing their share of surplus.
 * In NoMigration mode, creators can withdraw anytime (80% of surplus split by fee percentage).
 * Requires: config.json and token.json from previous scripts
 */

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk';
import { initializeWallet } from './walletManager';
import { getConnection, CONFIG, confirmTransaction, displayAmount } from './config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TokenData {
    tokenMint: string;
    poolAddress: string;
    creatorAddress: string;
    [key: string]: any;
}

interface ConfigData {
    configAddress: string;
    partnerAddress: string;
    creatorTradingFeePercentage: number;
    [key: string]: any;
}

async function getQuoteBalance(
    connection: any,
    owner: PublicKey
): Promise<bigint> {
    const balance = await connection.getBalance(owner);
    return BigInt(balance);
}

async function creatorWithdrawSurplus(
    client: DynamicBondingCurveClient,
    connection: any,
    creator: any,
    poolAddress: PublicKey
) {
    console.log('\n💰 CREATOR WITHDRAWING SURPLUS');
    console.log('===============================');
    
    // Get pool state
    const poolState = await client.state.getPool(poolAddress);
    if (!poolState) {
        throw new Error('Pool not found');
    }
    
    console.log(`\n📊 Pool State Before Withdrawal:`);
    console.log(`   Base Reserve: ${displayAmount(poolState.baseReserve, CONFIG.TOKEN.DECIMALS)}`);
    console.log(`   Quote Reserve: ${displayAmount(poolState.quoteReserve, 9)} SOL`);
    console.log(`   Creator Surplus: ${displayAmount(poolState.creatorSurplus, 9)} SOL`);
    console.log(`   Partner Surplus: ${displayAmount(poolState.partnerSurplus, 9)} SOL`);
    console.log(`   Protocol Surplus: ${displayAmount(poolState.protocolSurplus, 9)} SOL`);
    
    if (poolState.creatorSurplus === 0n) {
        console.log('\n⚠️  No surplus available for creator to withdraw yet.');
        console.log('   Please do some trading first (run script 3).');
        return null;
    }
    
    // Get balance before
    const balanceBefore = await getQuoteBalance(connection, creator.publicKey);
    console.log(`\n💼 Creator Balance Before: ${displayAmount(balanceBefore, 9)} SOL`);
    
    console.log(`\n📤 Creating withdraw surplus transaction...`);
    console.log(`   Withdrawing: ${displayAmount(poolState.creatorSurplus, 9)} SOL`);
    
    const withdrawTx = await client.creator.creatorWithdrawSurplus({
        creator: creator.publicKey,
        virtualPool: poolAddress,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    withdrawTx.recentBlockhash = blockhash;
    withdrawTx.feePayer = creator.publicKey;
    withdrawTx.sign(creator);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(withdrawTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    // Get balance after
    const balanceAfter = await getQuoteBalance(connection, creator.publicKey);
    const received = balanceAfter - balanceBefore;
    
    console.log(`\n💼 Creator Balance After: ${displayAmount(balanceAfter, 9)} SOL`);
    console.log(`\n📊 Withdrawal Summary:`);
    console.log(`   Amount Received: +${displayAmount(received, 9)} SOL`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    
    // Get updated pool state
    const poolStateAfter = await client.state.getPool(poolAddress);
    if (poolStateAfter) {
        console.log(`\n📊 Pool State After Withdrawal:`);
        console.log(`   Creator Surplus: ${displayAmount(poolStateAfter.creatorSurplus, 9)} SOL`);
        console.log(`   Partner Surplus: ${displayAmount(poolStateAfter.partnerSurplus, 9)} SOL`);
        console.log(`   Protocol Surplus: ${displayAmount(poolStateAfter.protocolSurplus, 9)} SOL`);
    }
    
    return signature;
}

async function partnerWithdrawSurplus(
    client: DynamicBondingCurveClient,
    connection: any,
    partner: any,
    poolAddress: PublicKey
) {
    console.log('\n💰 PARTNER WITHDRAWING SURPLUS (for comparison)');
    console.log('================================================');
    
    // Get pool state
    const poolState = await client.state.getPool(poolAddress);
    if (!poolState) {
        throw new Error('Pool not found');
    }
    
    if (poolState.partnerSurplus === 0n) {
        console.log('\n⚠️  No surplus available for partner to withdraw.');
        return null;
    }
    
    // Get balance before
    const balanceBefore = await getQuoteBalance(connection, partner.publicKey);
    console.log(`\n💼 Partner Balance Before: ${displayAmount(balanceBefore, 9)} SOL`);
    console.log(`   Partner Surplus Available: ${displayAmount(poolState.partnerSurplus, 9)} SOL`);
    
    console.log(`\n📤 Creating partner withdraw surplus transaction...`);
    
    const withdrawTx = await client.partner.partnerWithdrawSurplus({
        feeClaimer: partner.publicKey,
        virtualPool: poolAddress,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    withdrawTx.recentBlockhash = blockhash;
    withdrawTx.feePayer = partner.publicKey;
    withdrawTx.sign(partner);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(withdrawTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    // Get balance after
    const balanceAfter = await getQuoteBalance(connection, partner.publicKey);
    const received = balanceAfter - balanceBefore;
    
    console.log(`\n💼 Partner Balance After: ${displayAmount(balanceAfter, 9)} SOL`);
    console.log(`   Amount Received: +${displayAmount(received, 9)} SOL`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    
    return signature;
}

async function main() {
    console.log('🚀 Starting Creator Withdraw Module on Devnet\n');
    
    // Initialize wallet (creator)
    const creator = initializeWallet();
    console.log(`💼 Creator Address: ${creator.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(creator.publicKey);
    console.log(`💰 Creator Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance for transaction fees! Please airdrop some SOL:');
        console.error(`   solana airdrop 1 ${creator.publicKey.toString()} --url devnet`);
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
    
    // Load config data
    const configFilePath = join(process.cwd(), 'data', 'config.json');
    const configData: ConfigData = JSON.parse(readFileSync(configFilePath, 'utf-8'));
    
    console.log(`\n🏊 Pool Address: ${poolAddress.toString()}`);
    console.log(`📝 Config: NoMigration mode (can withdraw anytime)`);
    console.log(`📊 Fee Split: ${configData.creatorTradingFeePercentage}% Creator / ${100 - configData.creatorTradingFeePercentage}% Partner`);
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Creator withdraws surplus
    const creatorSig = await creatorWithdrawSurplus(client, connection, creator, poolAddress);
    
    if (creatorSig) {
        console.log('\n✅ Creator withdrawal completed successfully!');
        
        // If this wallet is also the partner, demonstrate partner withdrawal
        if (configData.partnerAddress === creator.publicKey.toString()) {
            console.log('\n💡 Note: Your wallet is both creator and partner.');
            console.log('   Demonstrating partner withdrawal as well...\n');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            await partnerWithdrawSurplus(client, connection, creator, poolAddress);
        }
    }
    
    console.log('\n✅ Withdrawal process completed!');
    console.log('\n📋 Key Points:');
    console.log('   - NoMigration mode allows withdrawals anytime');
    console.log('   - 90% of quote reserve is withdrawable (10% buffer)');
    console.log('   - 80% distributed to creator/partner (by fee percentage)');
    console.log('   - 20% goes to protocol');
    console.log(`   - Creator gets ${configData.creatorTradingFeePercentage}% of the 80% share`);
    console.log(`   - Partner gets ${100 - configData.creatorTradingFeePercentage}% of the 80% share`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
