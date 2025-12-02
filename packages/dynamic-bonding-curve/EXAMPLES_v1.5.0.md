# Examples - SDK v1.5.0 New Features

This document provides practical examples for all new features in SDK v1.5.0.

## Table of Contents

1. [NoMigration Mode Examples](#nomigration-mode-examples)
2. [Pausable Trading Examples](#pausable-trading-examples)
3. [Existing Token Pool Examples](#existing-token-pool-examples)
4. [Combined Features Examples](#combined-features-examples)

---

## NoMigration Mode Examples

### Example 1: Basic NoMigration Pool

```typescript
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
} from '@solana/web3.js';
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
    buildCurveWithMarketCap,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { NATIVE_MINT } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const client = DynamicBondingCurveClient.create(connection, 'confirmed');

// Generate keypairs
const partner = Keypair.generate();
const creator = Keypair.generate();
const configKeypair = Keypair.generate();

// Build curve with NoMigration
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.NO_MIGRATION, // No DEX migration
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
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
        },
    },
    dynamicFeeEnabled: false,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
    tokenType: TokenType.SPL,
    partnerLpPercentage: 0,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 0,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 50, // 50/50 split between partner and creator
    leftover: 0,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
    },
});

// Create config
const configTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: partner.publicKey,
    leftoverReceiver: partner.publicKey,
    quoteMint: NATIVE_MINT,
    payer: partner.publicKey,
    ...curveConfig,
});

// Sign and send config transaction
configTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
configTx.sign(partner, configKeypair);
await connection.sendTransaction(configTx, [partner, configKeypair]);

// Create pool
const baseMintKeypair = Keypair.generate();
const createPoolTx = await client.pool.createPool({
    baseMint: baseMintKeypair.publicKey,
    config: configKeypair.publicKey,
    name: 'My Token',
    symbol: 'MTK',
    uri: 'https://example.com/token.json',
    payer: creator.publicKey,
    poolCreator: creator.publicKey,
});

createPoolTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
createPoolTx.sign(creator, baseMintKeypair);
await connection.sendTransaction(createPoolTx, [creator, baseMintKeypair]);

console.log('NoMigration pool created successfully!');
```

### Example 2: NoMigration Surplus Withdrawal

```typescript
import BN from 'bn.js';

// ... after trading has occurred on the pool ...

const poolAddress = new PublicKey('YourPoolAddress...');

// Partner withdraws their share (no migration threshold needed!)
const partnerWithdrawTx = await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

partnerWithdrawTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
partnerWithdrawTx.sign(partner);
await connection.sendTransaction(partnerWithdrawTx, [partner]);

// Creator withdraws their share
const creatorWithdrawTx = await client.creator.creatorWithdrawSurplus({
    creator: creator.publicKey,
    virtualPool: poolAddress,
});

creatorWithdrawTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
creatorWithdrawTx.sign(creator);
await connection.sendTransaction(creatorWithdrawTx, [creator]);

// Protocol withdraws their share (20% of surplus)
const protocolWithdrawTx = await client.partner.protocolWithdrawSurplus({
    virtualPool: poolAddress,
});

protocolWithdrawTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
// Note: Protocol withdrawals go to pool authority's ATA
await connection.sendTransaction(protocolWithdrawTx, [protocolAuthority]);

console.log('Surplus withdrawn successfully from NoMigration pool!');
```

---

## Pausable Trading Examples

### Example 3: Create Pausable Pool

```typescript
import { PausableMode } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Build curve with pausable mode enabled
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.MET_DAMM_V2,
    tokenBaseDecimal: TokenDecimal.SIX,
    tokenQuoteDecimal: TokenDecimal.NINE,
    pausableMode: PausableMode.Pausable, // Enable pausable trading
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
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
        },
    },
    dynamicFeeEnabled: false,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.Customizable,
    tokenType: TokenType.SPL,
    partnerLpPercentage: 100,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 0,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 50,
    leftover: 0,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
    },
    migratedPoolFee: {
        collectFeeMode: CollectFeeMode.QuoteToken,
        dynamicFee: 1, // Enabled
        poolFeeBps: 250,
    },
});

// Create config and pool (same as previous examples)
// ...

console.log('Pausable pool created successfully!');
```

### Example 4: Pause/Unpause Trading Flow

```typescript
const poolAddress = new PublicKey('YourPoolAddress...');

// Pause trading
const pauseTx = await client.partner.pauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

pauseTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
pauseTx.sign(partner);
await connection.sendTransaction(pauseTx, [partner]);
console.log('Trading paused');

// Try to swap (this will fail)
try {
    const swapTx = await client.pool.swap({
        owner: trader.publicKey,
        pool: poolAddress,
        amountIn: new BN(LAMPORTS_PER_SOL),
        minimumAmountOut: new BN(0),
        swapBaseForQuote: false,
        referralTokenAccount: null,
    });
    // This won't execute
} catch (error) {
    console.log('Swap blocked: Trading is paused'); // Expected
}

// Unpause trading
const unpauseTx = await client.partner.unpauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

unpauseTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
unpauseTx.sign(partner);
await connection.sendTransaction(unpauseTx, [partner]);
console.log('Trading resumed');

// Now swaps work again
const swapTx = await client.pool.swap({
    owner: trader.publicKey,
    pool: poolAddress,
    amountIn: new BN(LAMPORTS_PER_SOL),
    minimumAmountOut: new BN(0),
    swapBaseForQuote: false,
    referralTokenAccount: null,
});
```

### Example 5: Emergency Exit Strategy (Pausable Mode)

```typescript
// Emergency scenario: Partner wants to exit completely

const poolAddress = new PublicKey('YourPoolAddress...');

// Step 1: Pause trading
const pauseTx = await client.partner.pauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

pauseTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
pauseTx.sign(partner);
await connection.sendTransaction(pauseTx, [partner]);
console.log('Step 1: Trading paused');

// Step 2: Withdraw 100% of quote tokens (special pausable mode behavior)
const withdrawTx = await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

withdrawTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
withdrawTx.sign(partner);
await connection.sendTransaction(withdrawTx, [partner]);
console.log('Step 2: Withdrew 100% of quote tokens');

// Step 3 (Optional): Resume trading if desired
const unpauseTx = await client.partner.unpauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

unpauseTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
unpauseTx.sign(partner);
await connection.sendTransaction(unpauseTx, [partner]);
console.log('Step 3: Trading resumed (optional)');
```

---

## Existing Token Pool Examples

### Example 6: Create Pool with Existing SPL Token

```typescript
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Assume you already have a token deployed
const existingTokenMint = new PublicKey('YourExistingSPLTokenMint...');

// Create config matching your token specifications
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.NO_MIGRATION, // Recommended for existing tokens
    tokenType: TokenType.SPL, // MUST match your token
    tokenBaseDecimal: TokenDecimal.SIX, // MUST match your token decimals
    tokenQuoteDecimal: TokenDecimal.NINE,
    pausableMode: PausableMode.Pausable,
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
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
        },
    },
    dynamicFeeEnabled: false,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
    partnerLpPercentage: 0,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 0,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 50,
    leftover: 0,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
    },
});

// Create config
const configKeypair = Keypair.generate();
const configTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: partner.publicKey,
    leftoverReceiver: partner.publicKey,
    quoteMint: NATIVE_MINT,
    payer: partner.publicKey,
    ...curveConfig,
});

configTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
configTx.sign(partner, configKeypair);
await connection.sendTransaction(configTx, [partner, configKeypair]);

// Create pool with existing token
const poolTx = await client.pool.createPoolWithExistingSplToken({
    payer: creator.publicKey,
    config: configKeypair.publicKey,
    poolCreator: creator.publicKey,
    existingTokenMint: existingTokenMint,
});

poolTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
poolTx.sign(creator);
await connection.sendTransaction(poolTx, [creator]);

console.log('Pool created with existing SPL token!');
```

### Example 7: Create Pool with Existing Token2022

```typescript
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Your existing Token2022 mint
const existingToken2022Mint = new PublicKey('YourExistingToken2022Mint...');

// Create config (same as above but with TokenType.Token2022)
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.NO_MIGRATION,
    tokenType: TokenType.Token2022, // Token2022 type
    tokenBaseDecimal: TokenDecimal.SIX,
    tokenQuoteDecimal: TokenDecimal.NINE,
    // ... rest of config same as above
});

// Create config transaction
// ... (same as previous example)

// Create pool with existing Token2022
const poolTx = await client.pool.createPoolWithExistingToken2022({
    payer: creator.publicKey,
    config: configKeypair.publicKey,
    poolCreator: creator.publicKey,
    existingTokenMint: existingToken2022Mint,
});

poolTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
poolTx.sign(creator);
await connection.sendTransaction(poolTx, [creator]);

console.log('Pool created with existing Token2022!');
```

---

## Combined Features Examples

### Example 8: NoMigration + Pausable + Existing Token

The ultimate flexible setup: Use an existing token, no DEX migration, with pause controls.

```typescript
// Your existing token
const existingTokenMint = new PublicKey('YourExistingTokenMint...');

// Build curve with all flexible features
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.NO_MIGRATION,    // No DEX required
    pausableMode: PausableMode.Pausable,              // Can pause/unpause
    tokenType: TokenType.SPL,
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
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
        },
    },
    dynamicFeeEnabled: false,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
    partnerLpPercentage: 0,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 0,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 50,
    leftover: 0,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
    },
});

// Create config
const configKeypair = Keypair.generate();
const configTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: partner.publicKey,
    leftoverReceiver: partner.publicKey,
    quoteMint: NATIVE_MINT,
    payer: partner.publicKey,
    ...curveConfig,
});

// Create pool with existing token
const poolTx = await client.pool.createPoolWithExistingSplToken({
    payer: creator.publicKey,
    config: configKeypair.publicKey,
    poolCreator: creator.publicKey,
    existingTokenMint: existingTokenMint,
});

// Now you have maximum flexibility:
// - No DEX migration requirement
// - Can pause/unpause trading anytime
// - Using your existing token
// - Can withdraw surplus anytime

console.log('Ultimate flexible pool created!');
```

### Example 9: Complete Lifecycle

```typescript
// 1. Setup
const existingToken = new PublicKey('YourToken...');
const configKeypair = Keypair.generate();

// 2. Create config with all features
const curveConfig = buildCurveWithMarketCap({
    // ... NoMigration + Pausable config
});

// 3. Create pool with existing token
const poolTx = await client.pool.createPoolWithExistingSplToken({
    payer: creator.publicKey,
    config: configKeypair.publicKey,
    poolCreator: creator.publicKey,
    existingTokenMint: existingToken,
});

// 4. Trading happens...
// Users buy/sell tokens

// 5. Partner pauses for maintenance
await client.partner.pauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// 6. Withdraw surplus (100% available due to pausable mode)
await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// 7. Resume trading
await client.partner.unpauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// 8. Later: Final withdrawal (NoMigration allows anytime)
await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

console.log('Complete lifecycle demonstrated!');
```

---

## Error Handling

### Example 10: Comprehensive Error Handling

```typescript
import { SendTransactionError } from '@solana/web3.js';

async function safePoolOperations() {
    try {
        // Attempt pause
        const pauseTx = await client.partner.pauseTrading({
            feeClaimer: partner.publicKey,
            virtualPool: poolAddress,
        });
        
        await connection.sendTransaction(pauseTx, [partner]);
        
    } catch (error) {
        if (error instanceof SendTransactionError) {
            const logs = error.logs;
            
            if (logs?.some(log => log.includes('0x1786'))) {
                console.error('ERROR: Pausable mode not enabled in config');
            } else if (logs?.some(log => log.includes('0x17a4'))) {
                console.error('ERROR: Pool is already paused');
            } else if (logs?.some(log => log.includes('0x17a3'))) {
                console.error('ERROR: Trading is paused');
            } else {
                console.error('ERROR: Unknown error', error);
            }
        }
    }
}

// Swap with proper error handling
async function safeSwap() {
    try {
        const swapTx = await client.pool.swap({
            owner: trader.publicKey,
            pool: poolAddress,
            amountIn: new BN(LAMPORTS_PER_SOL),
            minimumAmountOut: new BN(0),
            swapBaseForQuote: false,
            referralTokenAccount: null,
        });
        
        await connection.sendTransaction(swapTx, [trader]);
        
    } catch (error) {
        if (error instanceof SendTransactionError) {
            const logs = error.logs;
            
            if (logs?.some(log => log.includes('0x17a3'))) {
                console.error('Swap failed: Trading is currently paused');
                // Maybe check pool status and retry later
            } else if (logs?.some(log => log.includes('ExceededSlippage'))) {
                console.error('Swap failed: Slippage tolerance exceeded');
            } else {
                console.error('Swap failed:', error);
            }
        }
    }
}
```

---

## Testing Checklist

### Pre-deployment Testing

```typescript
// Test NoMigration
- [ ] Create config with NO_MIGRATION option
- [ ] Create pool and verify it works
- [ ] Execute swaps
- [ ] Withdraw surplus without reaching threshold
- [ ] Verify 90/10 split and distribution

// Test Pausable
- [ ] Create config with Pausable = 1
- [ ] Pause trading
- [ ] Verify swaps are blocked
- [ ] Withdraw 100% while paused
- [ ] Unpause trading
- [ ] Verify swaps work again

// Test Existing Token
- [ ] Deploy test token
- [ ] Create config matching token specs
- [ ] Create pool with existing SPL token
- [ ] Create pool with existing Token2022
- [ ] Execute swaps on both
- [ ] Verify balances

// Test Combined
- [ ] NoMigration + Pausable + Existing Token
- [ ] All operations work correctly
- [ ] Error handling works
- [ ] Edge cases covered
```

---

For more information, see:
- [Migration Guide](./MIGRATION_GUIDE_v1.5.0.md)
- [Full Documentation](./docs.md)
- [Changelog](./CHANGELOG.md)
