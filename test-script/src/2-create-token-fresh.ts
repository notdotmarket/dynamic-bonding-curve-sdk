/**
 * Script 2 (Fresh): Create Config AND Launch Token Together
 * 
 * This creates a fresh config and immediately launches a token on it
 * to avoid any seed derivation mismatches.
 */

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { 
    DynamicBondingCurveClient,
    buildCurveWithMarketCap,
    MigrationOption,
    TokenDecimal,
    ActivationType,
    BaseFeeMode,
    PausableMode,
    CollectFeeMode,
    MigrationFeeOption,
    TokenType,
    TokenUpdateAuthorityOption
} from '@notdotmarket/dynamic-bonding-curve-sdk';
import { initializeWallet } from './walletManager';
import { getConnection, CONFIG, confirmTransaction } from './config';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log('🚀 Starting Fresh Config + Token Launch on Devnet\n');
    
    // Initialize wallet (creator/partner)
    const wallet = initializeWallet();
    console.log(`💼 Wallet Address: ${wallet.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance! Need at least 0.5 SOL');
        process.exit(1);
    }
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Generate config keypair
    const configKeypair = Keypair.generate();
    console.log(`\n📝 Config Address: ${configKeypair.publicKey.toString()}`);
    
    // Build curve parameters (use EXACT same params as script 1)
    const curveConfig = buildCurveWithMarketCap({
        totalTokenSupply: CONFIG.TOKEN.TOTAL_SUPPLY,
        initialMarketCap: CONFIG.TOKEN.INITIAL_MARKET_CAP,
        migrationMarketCap: CONFIG.TOKEN.MIGRATION_MARKET_CAP,
        migrationOption: MigrationOption.NO_MIGRATION,
        pausableMode: PausableMode.Pausable,
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
        partnerLpPercentage: 100,
        creatorLpPercentage: 0,
        partnerLockedLpPercentage: 0,
        creatorLockedLpPercentage: 0,
        creatorTradingFeePercentage: CONFIG.FEE.CREATOR_TRADING_FEE_PERCENTAGE,
        leftover: 0,
        tokenUpdateAuthority: TokenUpdateAuthorityOption.PartnerUpdateAndMintAuthority,
        pausableMode: PausableMode.Pausable,
        noMigrationPartnerSurplusPercentage: 40,
        noMigrationCreatorSurplusPercentage: 40,
        noMigrationProtocolSurplusPercentage: 20,
        migrationFee: {
            feePercentage: 0,
            creatorFeePercentage: 0,
        },
    });
    
    console.log('\n⚙️  Creating config...');
    
    // Create config transaction
    const createConfigTx = await client.partner.createConfig({
        config: configKeypair.publicKey,
        feeClaimer: wallet.publicKey,
        leftoverReceiver: wallet.publicKey,
        quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // Native SOL
        payer: wallet.publicKey,
        ...curveConfig,
    });
    
    const { blockhash: configBlockhash } = await connection.getLatestBlockhash();
    createConfigTx.recentBlockhash = configBlockhash;
    createConfigTx.feePayer = wallet.publicKey;
    createConfigTx.sign(wallet, configKeypair);
    
    const configSignature = await connection.sendRawTransaction(createConfigTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Config Transaction: ${configSignature}`);
    await confirmTransaction(connection, configSignature);
    console.log('✅ Config created successfully!');
    
    // Generate token mint keypair
    const baseMintKeypair = Keypair.generate();
    console.log(`\n🪙  Token Mint: ${baseMintKeypair.publicKey.toString()}`);
    
    // Create metadata
    const metadata = {
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        description: 'Test token',
        image: 'https://via.placeholder.com/500',
    };
    
    // Use a short URI - Metaplex has length limits (in production, upload JSON to IPFS/Arweave)
    const metadataUri = 'https://example.com/token.json';
    
    console.log('\n📤 Creating pool...');
    console.log(`   Token Name: ${CONFIG.TOKEN.NAME}`);
    console.log(`   Token Symbol: ${CONFIG.TOKEN.SYMBOL}`);
    
    // Create pool transaction
    const createPoolTx = await client.pool.createPool({
        baseMint: baseMintKeypair.publicKey,
        config: configKeypair.publicKey,
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        uri: metadataUri,
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
    });
    
    const { blockhash: poolBlockhash } = await connection.getLatestBlockhash();
    createPoolTx.recentBlockhash = poolBlockhash;
    createPoolTx.feePayer = wallet.publicKey;
    createPoolTx.sign(wallet, baseMintKeypair);
    
    const poolSignature = await connection.sendRawTransaction(createPoolTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Pool Transaction: ${poolSignature}`);
    await confirmTransaction(connection, poolSignature);
    
    // Derive pool address
    const { deriveDbcPoolAddress } = await import('@notdotmarket/dynamic-bonding-curve-sdk');
    const poolAddress = deriveDbcPoolAddress(
        new PublicKey('So11111111111111111111111111111111111111112'),
        baseMintKeypair.publicKey,
        configKeypair.publicKey
    );
    
    console.log('\n✅ Token launched successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`   Config: ${configKeypair.publicKey.toString()}`);
    console.log(`   Token Mint: ${baseMintKeypair.publicKey.toString()}`);
    console.log(`   Pool Address: ${poolAddress.toString()}`);
    console.log(`   Creator: ${wallet.publicKey.toString()}`);
    console.log(`   Config Tx: https://solscan.io/tx/${configSignature}?cluster=devnet`);
    console.log(`   Pool Tx: https://solscan.io/tx/${poolSignature}?cluster=devnet`);
    
    // Save data
    const tokenData = {
        configAddress: configKeypair.publicKey.toString(),
        tokenMint: baseMintKeypair.publicKey.toString(),
        poolAddress: poolAddress.toString(),
        creatorAddress: wallet.publicKey.toString(),
        name: CONFIG.TOKEN.NAME,
        symbol: CONFIG.TOKEN.SYMBOL,
        decimals: CONFIG.TOKEN.DECIMALS,
        metadataUri,
        configSignature,
        poolSignature,
        timestamp: new Date().toISOString(),
    };
    
    const tokenFilePath = join(process.cwd(), 'data', 'token-fresh.json');
    writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    console.log(`\n📁 Data saved to: ${tokenFilePath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
