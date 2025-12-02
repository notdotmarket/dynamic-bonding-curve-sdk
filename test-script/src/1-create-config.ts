/**
 * Script 1: Create Config on Devnet
 * 
 * This script creates a new bonding curve configuration with:
 * - NoMigration mode (can withdraw without DEX migration)
 * - Pausable trading enabled
 * - SPL token type
 * - Linear fee scheduler
 */

import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
    DynamicBondingCurveClient,
    MigrationOption,
    TokenType,
    TokenDecimal,
    ActivationType,
    CollectFeeMode,
    MigrationFeeOption,
    TokenUpdateAuthorityOption,
    BaseFeeMode,
    PausableMode,
    buildCurveWithMarketCap,
} from '@notdotmarket/dynamic-bonding-curve-sdk';
import { initializeWallet, getKeypair } from './walletManager';
import { getConnection, CONFIG, confirmTransaction } from './config';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log('🚀 Starting Config Creation on Devnet\n');
    
    // Initialize wallet
    const wallet = initializeWallet();
    console.log(`💼 Wallet Address: ${wallet.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance! Please airdrop some SOL to your wallet:');
        console.error(`   solana airdrop 1 ${wallet.publicKey.toString()} --url devnet`);
        process.exit(1);
    }
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Generate config keypair
    const configKeypair = Keypair.generate();
    console.log(`\n📝 Config Address: ${configKeypair.publicKey.toString()}`);
    
    // Build curve configuration
    console.log('\n⚙️  Building curve configuration...');
    const curveConfig = buildCurveWithMarketCap({
        totalTokenSupply: CONFIG.TOKEN.TOTAL_SUPPLY,
        initialMarketCap: CONFIG.TOKEN.INITIAL_MARKET_CAP,
        migrationMarketCap: CONFIG.TOKEN.MIGRATION_MARKET_CAP,
        migrationOption: MigrationOption.NO_MIGRATION, // NoMigration mode
        pausableMode: PausableMode.Pausable, // Enable pausable trading
        tokenBaseDecimal: TokenDecimal.SIX,
        tokenQuoteDecimal: TokenDecimal.NINE,
        lockedVestingParam: {
            totalLockedVestingAmount: 0,
            numberOfVestingPeriod: 0,
            cliffUnlockAmount: 0,
            totalVestingDuration: 0,
            cliffDurationFromMigrationTime: 0,
        },
        baseFeeParams: {
            baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
            feeSchedulerParam: {
                startingFeeBps: CONFIG.FEE.STARTING_FEE_BPS,
                endingFeeBps: CONFIG.FEE.ENDING_FEE_BPS,
                numberOfPeriod: 0,
                totalDuration: 0,
            },
        },
        dynamicFeeEnabled: false,
        activationType: ActivationType.Slot,
        collectFeeMode: CollectFeeMode.QuoteToken,
        migrationFeeOption: MigrationFeeOption.FixedBps25,
        tokenType: TokenType.SPL,
        partnerLpPercentage: 100, // Partner gets all LP in NoMigration mode
        creatorLpPercentage: 0,
        partnerLockedLpPercentage: 0,
        creatorLockedLpPercentage: 0,
        creatorTradingFeePercentage: CONFIG.FEE.CREATOR_TRADING_FEE_PERCENTAGE,
        leftover: 0,
        tokenUpdateAuthority: TokenUpdateAuthorityOption.PartnerUpdateAndMintAuthority,
        migrationFee: {
            feePercentage: 0,
            creatorFeePercentage: 0,
        },
    });
    
    console.log('✅ Curve configuration built');
    console.log(`   - Migration Option: NoMigration`);
    console.log(`   - Pausable Mode: Enabled`);
    console.log(`   - Total Supply: ${CONFIG.TOKEN.TOTAL_SUPPLY.toLocaleString()}`);
    console.log(`   - Initial Market Cap: $${CONFIG.TOKEN.INITIAL_MARKET_CAP.toLocaleString()}`);
    console.log(`   - Creator Fee Share: ${CONFIG.FEE.CREATOR_TRADING_FEE_PERCENTAGE}%`);
    
    // Create config transaction
    console.log('\n📤 Creating config transaction...');
    const configTx = await client.partner.createConfig({
        config: configKeypair.publicKey,
        feeClaimer: wallet.publicKey, // Partner is the fee claimer
        leftoverReceiver: wallet.publicKey,
        quoteMint: CONFIG.QUOTE_MINT,
        payer: wallet.publicKey,
        ...curveConfig,
    });
    
    // Sign and send transaction
    console.log('✍️  Signing transaction...');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    configTx.recentBlockhash = blockhash;
    configTx.feePayer = wallet.publicKey;
    configTx.sign(wallet, configKeypair);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(configTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    
    // Confirm transaction
    await confirmTransaction(connection, signature);
    
    // Save config data
    const configData = {
        configAddress: configKeypair.publicKey.toString(),
        configSecretKey: Array.from(configKeypair.secretKey),
        partnerAddress: wallet.publicKey.toString(),
        quoteMint: CONFIG.QUOTE_MINT.toString(),
        migrationOption: 'NO_MIGRATION',
        pausableMode: 'PAUSABLE',
        totalSupply: CONFIG.TOKEN.TOTAL_SUPPLY,
        initialMarketCap: CONFIG.TOKEN.INITIAL_MARKET_CAP,
        migrationMarketCap: CONFIG.TOKEN.MIGRATION_MARKET_CAP,
        creatorTradingFeePercentage: CONFIG.FEE.CREATOR_TRADING_FEE_PERCENTAGE,
        signature,
        timestamp: new Date().toISOString(),
    };
    
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    
    const configFilePath = join(dataDir, 'config.json');
    writeFileSync(configFilePath, JSON.stringify(configData, null, 2));
    
    console.log('\n✅ Config created successfully!');
    console.log(`📁 Config data saved to: ${configFilePath}`);
    console.log(`\n📋 Summary:`);
    console.log(`   Config Address: ${configKeypair.publicKey.toString()}`);
    console.log(`   Partner Address: ${wallet.publicKey.toString()}`);
    console.log(`   Migration Mode: NoMigration (can withdraw anytime)`);
    console.log(`   Pausable: Yes`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
