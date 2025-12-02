/**
 * Script 3: Buy and Sell Tokens (Trading Module)
 * 
 * This script demonstrates buying and selling tokens on the bonding curve.
 * Requires: config.json and token.json from previous scripts
 */

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import { initializeWallet } from './walletManager';
import { getConnection, CONFIG, confirmTransaction, displayAmount } from './config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

interface TokenData {
    tokenMint: string;
    poolAddress: string;
    [key: string]: any;
}

async function getPoolState(client: DynamicBondingCurveClient, poolAddress: PublicKey) {
    const state = await client.state.getPool(poolAddress);
    if (!state) {
        throw new Error('Pool not found');
    }
    return state;
}

async function getTokenBalance(
    connection: any,
    owner: PublicKey,
    mint: PublicKey
): Promise<bigint> {
    try {
        const ata = getAssociatedTokenAddressSync(mint, owner, false);
        const account = await connection.getTokenAccountBalance(ata);
        return BigInt(account.value.amount);
    } catch {
        return 0n;
    }
}

async function buyTokens(
    client: DynamicBondingCurveClient,
    trader: any,
    poolAddress: PublicKey,
    tokenMint: PublicKey,
    amountIn: BN
) {
    console.log('\n💰 BUYING TOKENS');
    console.log('================');
    
    const connection = client.program.provider.connection;
    
    // Get quote for buy
    console.log(`\n📊 Getting quote for ${displayAmount(amountIn, 9)} SOL...`);
    const quote = await client.pool.getSwapQuote({
        pool: poolAddress,
        amountIn: amountIn.toString(),
        swapBaseForQuote: false, // Buying base token with quote (SOL)
    });
    
    console.log(`   Expected tokens: ${displayAmount(quote.amountOut, CONFIG.TOKEN.DECIMALS)} ${CONFIG.TOKEN.SYMBOL}`);
    console.log(`   Fee: ${displayAmount(quote.fee, 9)} SOL`);
    console.log(`   Price impact: ${quote.priceImpact.toFixed(4)}%`);
    
    // Get balances before
    const solBefore = await connection.getBalance(trader.publicKey);
    const tokenBefore = await getTokenBalance(connection, trader.publicKey, tokenMint);
    
    console.log(`\n💼 Balances Before:`);
    console.log(`   SOL: ${displayAmount(solBefore, 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: ${displayAmount(tokenBefore, CONFIG.TOKEN.DECIMALS)}`);
    
    // Calculate minimum amount out with slippage
    const slippageFactor = new BN(10000 - CONFIG.TRADING.SLIPPAGE_BPS);
    const minAmountOut = new BN(quote.amountOut).mul(slippageFactor).div(new BN(10000));
    
    console.log(`\n📤 Creating buy transaction...`);
    const swapTx = await client.pool.swap({
        owner: trader.publicKey,
        pool: poolAddress,
        amountIn,
        minimumAmountOut: minAmountOut,
        swapBaseForQuote: false,
        referralTokenAccount: null,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = trader.publicKey;
    swapTx.sign(trader);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(swapTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    // Get balances after
    const solAfter = await connection.getBalance(trader.publicKey);
    const tokenAfter = await getTokenBalance(connection, trader.publicKey, tokenMint);
    
    console.log(`\n💼 Balances After:`);
    console.log(`   SOL: ${displayAmount(solAfter, 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: ${displayAmount(tokenAfter, CONFIG.TOKEN.DECIMALS)}`);
    
    console.log(`\n📊 Changes:`);
    console.log(`   SOL: ${displayAmount(BigInt(solAfter - solBefore), 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: +${displayAmount(tokenAfter - tokenBefore, CONFIG.TOKEN.DECIMALS)}`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    
    return tokenAfter - tokenBefore;
}

async function sellTokens(
    client: DynamicBondingCurveClient,
    trader: any,
    poolAddress: PublicKey,
    tokenMint: PublicKey,
    amountIn: BN
) {
    console.log('\n💸 SELLING TOKENS');
    console.log('=================');
    
    const connection = client.program.provider.connection;
    
    // Get quote for sell
    console.log(`\n📊 Getting quote for ${displayAmount(amountIn, CONFIG.TOKEN.DECIMALS)} ${CONFIG.TOKEN.SYMBOL}...`);
    const quote = await client.pool.getSwapQuote({
        pool: poolAddress,
        amountIn: amountIn.toString(),
        swapBaseForQuote: true, // Selling base token for quote (SOL)
    });
    
    console.log(`   Expected SOL: ${displayAmount(quote.amountOut, 9)}`);
    console.log(`   Fee: ${displayAmount(quote.fee, CONFIG.TOKEN.DECIMALS)} ${CONFIG.TOKEN.SYMBOL}`);
    console.log(`   Price impact: ${quote.priceImpact.toFixed(4)}%`);
    
    // Get balances before
    const solBefore = await connection.getBalance(trader.publicKey);
    const tokenBefore = await getTokenBalance(connection, trader.publicKey, tokenMint);
    
    console.log(`\n💼 Balances Before:`);
    console.log(`   SOL: ${displayAmount(solBefore, 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: ${displayAmount(tokenBefore, CONFIG.TOKEN.DECIMALS)}`);
    
    // Calculate minimum amount out with slippage
    const slippageFactor = new BN(10000 - CONFIG.TRADING.SLIPPAGE_BPS);
    const minAmountOut = new BN(quote.amountOut).mul(slippageFactor).div(new BN(10000));
    
    console.log(`\n📤 Creating sell transaction...`);
    const swapTx = await client.pool.swap({
        owner: trader.publicKey,
        pool: poolAddress,
        amountIn,
        minimumAmountOut: minAmountOut,
        swapBaseForQuote: true,
        referralTokenAccount: null,
    });
    
    // Sign and send
    console.log('✍️  Signing transaction...');
    const { blockhash } = await connection.getLatestBlockhash();
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = trader.publicKey;
    swapTx.sign(trader);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(swapTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.COMMITMENT,
    });
    
    console.log(`📝 Transaction Signature: ${signature}`);
    await confirmTransaction(connection, signature);
    
    // Get balances after
    const solAfter = await connection.getBalance(trader.publicKey);
    const tokenAfter = await getTokenBalance(connection, trader.publicKey, tokenMint);
    
    console.log(`\n💼 Balances After:`);
    console.log(`   SOL: ${displayAmount(solAfter, 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: ${displayAmount(tokenAfter, CONFIG.TOKEN.DECIMALS)}`);
    
    console.log(`\n📊 Changes:`);
    console.log(`   SOL: +${displayAmount(BigInt(solAfter - solBefore), 9)}`);
    console.log(`   ${CONFIG.TOKEN.SYMBOL}: ${displayAmount(tokenAfter - tokenBefore, CONFIG.TOKEN.DECIMALS)}`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
}

async function main() {
    console.log('🚀 Starting Trading Module on Devnet\n');
    
    // Initialize wallet (trader)
    const trader = initializeWallet();
    console.log(`💼 Trader Address: ${trader.publicKey.toString()}`);
    
    // Get connection
    const connection = getConnection();
    
    // Check balance
    const balance = await connection.getBalance(trader.publicKey);
    console.log(`💰 Trader Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance for trading! Please airdrop some SOL:');
        console.error(`   solana airdrop 1 ${trader.publicKey.toString()} --url devnet`);
        process.exit(1);
    }
    
    // Load token data
    const tokenFilePath = join(process.cwd(), 'data', 'token.json');
    if (!existsSync(tokenFilePath)) {
        console.error('❌ Token file not found! Please run script 2 first.');
        process.exit(1);
    }
    
    const tokenData: TokenData = JSON.parse(readFileSync(tokenFilePath, 'utf-8'));
    const tokenMint = new PublicKey(tokenData.tokenMint);
    const poolAddress = new PublicKey(tokenData.poolAddress);
    
    console.log(`\n🪙  Token Mint: ${tokenMint.toString()}`);
    console.log(`🏊 Pool Address: ${poolAddress.toString()}`);
    
    // Initialize SDK client
    const client = DynamicBondingCurveClient.create(connection, CONFIG.COMMITMENT);
    
    // Get pool state
    const poolState = await getPoolState(client, poolAddress);
    console.log(`\n📊 Pool State:`);
    console.log(`   Base Reserve: ${displayAmount(poolState.baseReserve, CONFIG.TOKEN.DECIMALS)} ${CONFIG.TOKEN.SYMBOL}`);
    console.log(`   Quote Reserve: ${displayAmount(poolState.quoteReserve, 9)} SOL`);
    
    // BUY TOKENS
    const buyAmount = new BN(CONFIG.TRADING.BUY_AMOUNT_SOL * LAMPORTS_PER_SOL);
    const tokensBought = await buyTokens(client, trader, poolAddress, tokenMint, buyAmount);
    
    // Wait a bit
    console.log('\n⏳ Waiting 3 seconds before selling...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // SELL 50% OF TOKENS
    const sellAmount = new BN((tokensBought / 2n).toString());
    await sellTokens(client, trader, poolAddress, tokenMint, sellAmount);
    
    console.log('\n✅ Trading completed successfully!');
    console.log('\n💡 Tip: You can run this script multiple times to test trading.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
