# Migration Guide - SDK v1.5.0

## Overview

SDK version 1.5.0 introduces three major features:
1. **NoMigration Mode** - Launch tokens without DEX migration
2. **Pausable Trading** - Emergency controls for partners
3. **Existing Token Pools** - Create bonding curves with pre-existing tokens

All changes are **backward compatible** - existing integrations continue to work without modifications.

---

## 🆕 NoMigration Mode

### What's New

Pools can now operate without requiring migration to a DEX (DAMM V1 or V2).

### Migration Option Enum Update

```typescript
export enum MigrationOption {
    MET_DAMM = 0,        // Existing: Migrate to DAMM V1
    MET_DAMM_V2 = 1,     // Existing: Migrate to DAMM V2
    NO_MIGRATION = 2,    // NEW: No migration required
}
```

### Benefits

- ✅ Flexible surplus withdrawal without waiting for migration threshold
- ✅ No liquidity pool creation required
- ✅ Simplified token launch flow
- ✅ Partners, creators, and protocol can withdraw anytime

### Surplus Distribution

**Withdrawable Amount**: 90% of current `quoteReserve`  
**Buffer**: 10% remains in pool

**Distribution**:
- Partners + Creators: 80% of withdrawable (split by `creatorTradingFeePercentage`)
- Protocol: 20% of withdrawable

### Example Usage

```typescript
import { 
    DynamicBondingCurveClient, 
    MigrationOption,
    buildCurveWithMarketCap 
} from '@meteora-ag/dynamic-bonding-curve-sdk';

// Create config with NoMigration mode
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    migrationOption: MigrationOption.NO_MIGRATION,  // No DEX migration
    // ... other parameters
});

const configTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: partner.publicKey,
    leftoverReceiver: partner.publicKey,
    quoteMint: NATIVE_MINT,
    payer: partner.publicKey,
    ...curveConfig,
});
```

### Withdrawal Flow (NoMigration)

```typescript
// No need to wait for migration threshold!
// Withdraw anytime after trading begins

// Partner withdrawal
const partnerWithdrawTx = await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// Creator withdrawal
const creatorWithdrawTx = await client.creator.creatorWithdrawSurplus({
    creator: creator.publicKey,
    virtualPool: poolAddress,
});
```

### When to Use NoMigration

- 🎯 Token launches without DEX listing plans
- 🎯 Short-term fundraising campaigns
- 🎯 Community tokens without liquidity requirements
- 🎯 Testing and development
- 🎯 Projects wanting flexible exit strategies

---

## 🛑 Pausable Trading

### What's New

Partners can now pause and unpause trading on pools when pausable mode is enabled.

### New Enum

```typescript
export enum PausableMode {
    NotPausable = 0,  // Default: Cannot pause trading
    Pausable = 1,     // Enable pause/unpause functionality
}
```

### Configuration

Add `pausableMode` to your config parameters:

```typescript
const curveConfig = buildCurveWithMarketCap({
    // ... existing parameters
    pausableMode: PausableMode.Pausable,  // Enable pausable trading
    // ... other parameters
});
```

### New Methods

#### Pause Trading

```typescript
/**
 * Pause trading on a pool
 * @requires pausableMode = 1 in config
 * @requires signer must be fee claimer (partner)
 */
await client.partner.pauseTrading({
    feeClaimer: partnerKeypair.publicKey,
    virtualPool: poolAddress,
});
```

#### Unpause Trading

```typescript
/**
 * Resume trading on a pool
 * @requires pausableMode = 1 in config
 * @requires pool must be currently paused
 * @requires signer must be fee claimer (partner)
 */
await client.partner.unpauseTrading({
    feeClaimer: partnerKeypair.publicKey,
    virtualPool: poolAddress,
});
```

### Special Pausable Mode Behavior

When `pausableMode = 1` AND trading is paused:
- ✅ Partner can withdraw **100%** of accumulated quote tokens
- ✅ Normal percentage splits don't apply during pause
- ✅ Provides flexible exit strategy for partners

### Error Handling

```typescript
try {
    await client.pool.swap(swapParams);
} catch (error) {
    if (error.message.includes('0x17a3')) {
        console.error('Trading is currently paused');
    }
    if (error.message.includes('0x1786')) {
        console.error('Pausable mode not enabled in config');
    }
}
```

### Error Codes

- `0x17a3` - `TradingIsPaused`: Swap attempted on paused pool
- `0x17a4` - `TradingIsNotPaused`: Unpause attempted on active pool
- `0x1786` - `PausableModeNotEnabled`: Pause operation on non-pausable pool

### Use Cases

1. **Emergency Controls**: Halt trading during security incidents
2. **Market Making**: Pause during extreme volatility
3. **Maintenance**: Stop trading during parameter updates
4. **Exit Strategy**: Pause + withdraw 100% + optionally unpause

### Complete Example

```typescript
// 1. Create config with pausable mode
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    pausableMode: PausableMode.Pausable,  // Enable pausable
    // ... other config
});

// 2. Trading happens normally...

// 3. Partner decides to pause
await client.partner.pauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// 4. Withdraw 100% while paused (special behavior)
await client.partner.partnerWithdrawSurplus({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});

// 5. (Optional) Resume trading
await client.partner.unpauseTrading({
    feeClaimer: partner.publicKey,
    virtualPool: poolAddress,
});
```

---

## 🪙 Existing Token Pool Support

### What's New

Create bonding curve pools using tokens that already exist, rather than minting new ones.

### Supported Standards

- ✅ SPL Token (Token Program)
- ✅ Token-2022 (Token Extensions Program)

### New Methods

#### Create Pool with Existing SPL Token

```typescript
/**
 * Create bonding curve pool with existing SPL token
 * @requires tokenType in config must be SPL (0)
 * @requires poolCreator must own the token mint
 * @requires token decimals must match config tokenDecimal
 */
await client.pool.createPoolWithExistingSplToken({
    payer: creator.publicKey,
    config: configAddress,
    poolCreator: creator.publicKey,
    existingTokenMint: existingSplTokenAddress,
});
```

#### Create Pool with Existing Token2022

```typescript
/**
 * Create bonding curve pool with existing Token2022
 * @requires tokenType in config must be Token2022 (1)
 * @requires poolCreator must own the token mint
 * @requires token decimals must match config tokenDecimal
 */
await client.pool.createPoolWithExistingToken2022({
    payer: creator.publicKey,
    config: configAddress,
    poolCreator: creator.publicKey,
    existingTokenMint: existingToken2022Address,
});
```

### Requirements

1. **Ownership**: Pool creator must own the existing token mint
2. **Balance**: Creator must have sufficient tokens to fund the bonding curve
3. **Type Match**: Token standard must match `tokenType` in config
4. **Decimal Match**: Token decimals must match `tokenDecimal` in config

### Complete Example

```typescript
import { 
    DynamicBondingCurveClient,
    MigrationOption,
    TokenType,
    TokenDecimal,
    buildCurveWithMarketCap
} from '@meteora-ag/dynamic-bonding-curve-sdk';

// 1. You already have a token deployed
const existingToken = new PublicKey('YourExistingTokenMintAddress...');

// 2. Create config matching your token
const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    initialMarketCap: 5000,
    migrationMarketCap: 1000000,
    tokenType: TokenType.SPL,          // Match your token type
    tokenBaseDecimal: TokenDecimal.SIX, // Match your token decimals
    tokenQuoteDecimal: TokenDecimal.NINE,
    migrationOption: MigrationOption.NO_MIGRATION, // Recommended
    // ... other parameters
});

const configTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: partner.publicKey,
    leftoverReceiver: partner.publicKey,
    quoteMint: NATIVE_MINT,
    payer: partner.publicKey,
    ...curveConfig,
});

// 3. Create pool with your existing token
const poolTx = await client.pool.createPoolWithExistingSplToken({
    payer: creator.publicKey,
    config: configKeypair.publicKey,
    poolCreator: creator.publicKey,
    existingTokenMint: existingToken,
});

// 4. Users can now trade on the bonding curve
const swapTx = await client.pool.swap({
    owner: user.publicKey,
    pool: poolAddress,
    amountIn: new BN(LAMPORTS_PER_SOL * 5),
    minimumAmountOut: new BN(0),
    swapBaseForQuote: false, // Buy tokens with SOL
    referralTokenAccount: null,
});
```

### Best Practices

- ✅ Use `NO_MIGRATION` mode for existing token pools
- ✅ Ensure sufficient token balance before pool creation
- ✅ Verify token decimals match config
- ✅ Test on devnet first
- ✅ Consider enabling `pausableMode` for control

---

## 🔧 Breaking Changes

**None** - All changes are backward compatible.

Existing code continues to work:
- Default `migrationOption` behavior unchanged (DAMM V1/V2)
- Default `pausableMode = NotPausable` (no pause functionality)
- Original pool creation methods still work

---

## 📦 Installation

```bash
npm install @meteora-ag/dynamic-bonding-curve-sdk@1.5.0
# or
yarn add @meteora-ag/dynamic-bonding-curve-sdk@1.5.0
# or
pnpm install @meteora-ag/dynamic-bonding-curve-sdk@1.5.0
```

---

## 🌐 Program IDs

### Mainnet
```typescript
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from '@meteora-ag/dynamic-bonding-curve-sdk';
// dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
```

### Devnet
```typescript
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID_DEVNET } from '@meteora-ag/dynamic-bonding-curve-sdk';
// FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H
```

---

## 📚 Additional Resources

- [Full Documentation](./docs.md)
- [Changelog](./CHANGELOG.md)
- [README](./README.md)
- [GitHub Repository](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk)

---

## 💬 Support

For questions or issues:
- Open an issue on GitHub
- Contact the Meteora development team
- Check the documentation

**SDK Version**: 1.5.0  
**Program Version**: 0.1.7  
**Anchor Version**: 0.31.0
