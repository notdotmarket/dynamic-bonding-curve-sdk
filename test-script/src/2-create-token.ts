/**
 * Script 2: Launch a New Token
 * 
 * This script creates a new token pool on the bonding curve.
 * Requires: config.json from script 1
 */

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk';
import { initializeWallet } from './walletManager';
import { getConnection, CONFIG, confirmTransaction } from './config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ConfigData {
    configAddress: string;
    partnerAddress: string;
    [key: string]: any;
}

async function main() {
    console.log('🚀 Starting Token Launch on Devnet\n');
    
    // Initialize wallet (creator)
    const creator = initializeWallet();
    console.log(`💼 Creator Address: ${creator.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(creator.publicKey);
    console.log(`💰 Creator Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance! Please airdrop some SOL:');
        console.error(`   solana airdrop 1 ${creator.publicKey.toString()} --url devnet`);
        process.exit(1);
    }
    
    // Load config data
    const configFilePath = join(process.cwd(), 'data', 'config.json');
    if (!existsSync(configFilePath)) {
        console.error('❌ Config file not found! Please run script 1 first.');
        process.exit(1);
    }
    
    const configData: ConfigData = JSON.parse(readFileSync(configFilePath, 'utf-8'));
    const configAddress = new PublicKey(configData.configAddress);
    console.log(`\n📝 Using Config: ${configAddress.toString()}`);
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Fetch config to verify it exists and get quoteMint
    const configAccount = await client.state.getPoolConfig(configAddress);
    if (!configAccount) {
        console.error('❌ Config not found on-chain! Please verify the config address.');
        process.exit(1);
    }
    console.log(`✅ Config found on-chain`);
    console.log(`   Quote Mint: ${configAccount.quoteMint.toString()}`);
    console.log(`   Token Type: ${configAccount.tokenType}`);
    
    // Generate token mint keypair
    const baseMintKeypair = Keypair.generate();
    console.log(`\n🪙  Token Mint: ${baseMintKeypair.publicKey.toString()}`);
    
    // Debug: Import helper and manually derive pool address
    const { deriveDbcPoolAddress } = await import('@notdotmarket/dynamic-bonding-curve-sdk');
    const manualPoolAddress = deriveDbcPoolAddress(
        configAccount.quoteMint,
        baseMintKeypair.publicKey,
        configAddress
    );
    console.log(`🔍 Expected Pool Address (manual derivation): ${manualPoolAddress.toString()}`);
    
    // Create metadata URI (you can upload to IPFS/Arweave in production)
    const metadata = {
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        description: 'A test token launched on Meteora Dynamic Bonding Curve',
        image: 'https://via.placeholder.com/500', // Replace with actual image URL
        external_url: 'https://example.com',
        attributes: [],
    };
    
    // For testing, we'll use a data URL (in production, upload to IPFS/Arweave)
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
    
    console.log('\n📤 Creating pool transaction...');
    console.log(`   Token Name: ${CONFIG.TOKEN.NAME}`);
    console.log(`   Token Symbol: ${CONFIG.TOKEN.SYMBOL}`);
    console.log(`   Token Decimals: ${CONFIG.TOKEN.DECIMALS}`);
    
    // Create pool
    const createPoolTx = await client.pool.createPool({
        baseMint: baseMintKeypair.publicKey,
        config: configAddress,
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        uri: metadataUri,
        payer: creator.publicKey,
        poolCreator: creator.publicKey,
    });
    
    // Sign and send transaction
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    createPoolTx.recentBlockhash = blockhash;
    createPoolTx.feePayer = creator.publicKey;
    createPoolTx.sign(creator, baseMintKeypair);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(createPoolTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    
    // Confirm transaction
    await confirmTransaction(connection, signature);
    
    // Derive pool address using the SDK's helper function  
    const poolAddress = deriveDbcPoolAddress(configAccount.quoteMint, baseMintKeypair.publicKey, configAddress);
    
    console.log(`\n🏊 Pool Address: ${poolAddress.toString()}`);
    
    // Save token data
    const tokenData = {
        tokenMint: baseMintKeypair.publicKey.toString(),
        tokenMintSecretKey: Array.from(baseMintKeypair.secretKey),
        poolAddress: poolAddress.toString(),
        creatorAddress: creator.publicKey.toString(),
        configAddress: configAddress.toString(),
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        decimals: CONFIG.TOKEN.DECIMALS,
        metadataUri,
        signature,
        timestamp: new Date().toISOString(),
    };
    
    const tokenFilePath = join(process.cwd(), 'data', 'token.json');
    writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    
    console.log('\n✅ Token launched successfully!');
    console.log(`📁 Token data saved to: ${tokenFilePath}`);
    console.log(`\n📋 Summary:`);
    console.log(`   Token Mint: ${baseMintKeypair.publicKey.toString()}`);
    console.log(`   Pool Address: ${poolAddress.toString()}`);
    console.log(`   Creator: ${creator.publicKey.toString()}`);
    console.log(`   Name: ${CONFIG.TOKEN.NAME}`);
    console.log(`   Symbol: ${CONFIG.TOKEN.SYMBOL}`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
