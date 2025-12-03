# New Features in v1.6.0

This document describes the new features added in SDK version 1.6.0.

## Overview

Version 1.6.0 introduces two new optional features for enhanced control over token trading:

1. **Taxed Selling** - Apply additional fees on sell transactions
2. **Bonding Curve Expiry** - Set time limits on bonding curve trading

Both features are **optional** and **backward compatible**.

---

## 1. Taxed Selling

### Description

The taxed selling feature allows you to apply an additional 10% trading fee specifically on sell transactions (when users sell the base token for quote token).

### Use Cases

- **Anti-Dumping Mechanism**: Discourage rapid selling by making it more expensive
- **Long-term Holder Incentives**: Encourage users to hold tokens longer
- **Revenue Generation**: Additional fee revenue from sell transactions
- **Market Stabilization**: Reduce sell pressure during volatile periods

### Configuration

```typescript
import { buildCurve, MigrationOption, TokenDecimal, BaseFeeMode, ActivationType, CollectFeeMode, MigrationFeeOption, TokenType, TokenUpdateAuthorityOption } from '@notdotmarket/dynamic-bonding-curve-sdk'

const curveConfig = buildCurve({
    totalTokenSupply: 1000000000,
    percentageSupplyOnMigration: 10,
    migrationQuoteThreshold: 300,
    migrationOption: MigrationOption.NO_MIGRATION,
    tokenBaseDecimal: TokenDecimal.NINE,
    tokenQuoteDecimal: TokenDecimal.NINE,
    // ... other parameters ...
    
    // NEW: Enable taxed selling (10% fee on sells)
    taxedSellingEnabled: true, // Default: false
})
```

### Behavior

- **When enabled (`true`)**: Sell transactions incur an additional 10% trading fee on top of base trading fees
- **When disabled (`false`)**: Normal trading fees apply to both buys and sells
- **Default value**: `false` (disabled) - backward compatible with existing code

### Example Scenarios

#### Scenario 1: Taxed Selling Disabled (Default)
```typescript
const config = buildCurve({
    // ... parameters ...
    taxedSellingEnabled: false, // or omit this field
})

// Trading fees:
// - Buy: Base trading fee only
// - Sell: Base trading fee only
```

#### Scenario 2: Taxed Selling Enabled
```typescript
const config = buildCurve({
    // ... parameters ...
    taxedSellingEnabled: true,
})

// Trading fees:
// - Buy: Base trading fee only
// - Sell: Base trading fee + 10% additional tax
```

### Technical Details

- Field name in types: `taxedSellingEnabled` (boolean)
- On-chain representation: `taxed_selling_enabled` (u8: 0 or 1)
- Conversion: `taxedSellingEnabled ? 1 : 0`
- Applies to: Sell transactions only (base token → quote token)

---

## 2. Bonding Curve Expiry

### Description

The bonding curve expiry feature allows you to set a time limit on how long the bonding curve will accept trades. After the expiry time, trading on the bonding curve is automatically disabled.

### Use Cases

- **Limited-Time Launches**: Create urgency for token launches
- **Fair Launch Windows**: Ensure trading opportunity is time-bounded
- **Promotional Campaigns**: Run time-limited token sales
- **Migration Enforcement**: Force transition to DEX after a set period
- **Compliance Requirements**: Meet regulatory time-bound requirements

### Configuration

```typescript
const curveConfig = buildCurve({
    totalTokenSupply: 1000000000,
    percentageSupplyOnMigration: 10,
    migrationQuoteThreshold: 300,
    migrationOption: MigrationOption.NO_MIGRATION,
    tokenBaseDecimal: TokenDecimal.NINE,
    tokenQuoteDecimal: TokenDecimal.NINE,
    // ... other parameters ...
    
    // NEW: Set bonding curve to expire after 7 days
    bondingCurveExpiryDays: 7, // Default: 0 (no expiry)
})
```

### Behavior

- **Value > 0**: Bonding curve expires after specified number of days from creation
- **Value = 0**: No expiry, bonding curve trades indefinitely (default)
- **Minimum value**: 1 day
- **After expiry**: All trading transactions will fail with `BondingCurveExpired` error

### Example Scenarios

#### Scenario 1: No Expiry (Default)
```typescript
const config = buildCurve({
    // ... parameters ...
    bondingCurveExpiryDays: 0, // or omit this field
})

// Bonding curve remains active indefinitely
// Trading continues until migration threshold or other conditions
```

#### Scenario 2: 7-Day Limited Launch
```typescript
const config = buildCurve({
    // ... parameters ...
    bondingCurveExpiryDays: 7,
})

// Bonding curve expires 7 days after pool creation
// After 7 days, all swap attempts will fail
// Creates urgency for early participation
```

#### Scenario 3: 30-Day Fair Launch
```typescript
const config = buildCurve({
    // ... parameters ...
    bondingCurveExpiryDays: 30,
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationQuoteThreshold: 50000,
})

// Two possible outcomes:
// 1. Pool reaches $50,000 threshold → migrates to DEX before 30 days
// 2. Pool doesn't reach threshold → expires after 30 days, trading stops
```

### Technical Details

- Field name in types: `bondingCurveExpiryDays` (number)
- On-chain representation in ConfigParameters: `bonding_curve_expiry_days` (u32)
- On-chain representation in PoolConfig: `bonding_curve_expiry_time` (i64 Unix timestamp)
- Conversion: Pool creation time + (days × 86400 seconds)
- Error on expired trading: `BondingCurveExpired` (code 6054)

---

## Complete Example: Using Both Features

```typescript
import { 
    buildCurve, 
    MigrationOption, 
    TokenDecimal, 
    BaseFeeMode, 
    ActivationType, 
    CollectFeeMode, 
    MigrationFeeOption, 
    TokenType, 
    TokenUpdateAuthorityOption,
    PausableMode 
} from '@notdotmarket/dynamic-bonding-curve-sdk'

const curveConfig = buildCurve({
    // Basic configuration
    totalTokenSupply: 1000000000,
    percentageSupplyOnMigration: 15,
    migrationQuoteThreshold: 10000,
    migrationOption: MigrationOption.MET_DAMM_V2,
    tokenBaseDecimal: TokenDecimal.NINE,
    tokenQuoteDecimal: TokenDecimal.NINE,
    
    // Token distribution
    partnerLpPercentage: 25,
    creatorLpPercentage: 25,
    partnerLockedLpPercentage: 25,
    creatorLockedLpPercentage: 25,
    
    // Fee configuration
    baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
        },
    },
    dynamicFeeEnabled: true,
    creatorTradingFeePercentage: 10,
    
    // Other settings
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.Customizable,
    tokenType: TokenType.SPL,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    pausableMode: PausableMode.Pausable,
    
    // Vesting (none in this example)
    lockedVestingParam: {
        totalLockedVestingAmount: 0,
        numberOfVestingPeriod: 0,
        cliffUnlockAmount: 0,
        totalVestingDuration: 0,
        cliffDurationFromMigrationTime: 0,
    },
    
    // NoMigration surplus distribution
    noMigrationPartnerSurplusPercentage: 40,
    noMigrationCreatorSurplusPercentage: 40,
    noMigrationProtocolSurplusPercentage: 20,
    
    // Migration fees
    migrationFee: {
        feePercentage: 5,
        creatorFeePercentage: 50,
    },
    
    // Migrated pool settings
    migratedPoolFee: {
        collectFeeMode: CollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Enabled,
        poolFeeBps: 250,
    },
    
    leftover: 0,
    
    // ✨ NEW FEATURES ✨
    
    // Enable 10% tax on sell transactions
    taxedSellingEnabled: true,
    
    // Set bonding curve to expire after 14 days
    bondingCurveExpiryDays: 14,
})

// Create the config
const createConfigTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: wallet.publicKey,
    leftoverReceiver: wallet.publicKey,
    payer: wallet.publicKey,
    quoteMint: NATIVE_MINT,
    ...curveConfig,
})
```

---

## Migration Guide

### From v1.5.x to v1.6.0

**No breaking changes!** Your existing code will continue to work without modifications.

#### Option 1: Do Nothing (Recommended for most users)
```typescript
// Your existing code remains the same
const config = buildCurve({
    // ... your existing parameters ...
})

// Behavior:
// - taxedSellingEnabled defaults to false
// - bondingCurveExpiryDays defaults to 0 (no expiry)
```

#### Option 2: Explicitly Disable New Features
```typescript
const config = buildCurve({
    // ... your existing parameters ...
    taxedSellingEnabled: false,
    bondingCurveExpiryDays: 0,
})
```

#### Option 3: Enable New Features
```typescript
const config = buildCurve({
    // ... your existing parameters ...
    taxedSellingEnabled: true,      // Enable 10% sell tax
    bondingCurveExpiryDays: 30,     // Expire after 30 days
})
```

---

## Available in All Build Functions

Both new features are supported in all curve building functions:

1. ✅ `buildCurve()`
2. ✅ `buildCurveWithMarketCap()`
3. ✅ `buildCurveWithTwoSegments()`
4. ✅ `buildCurveWithMidPrice()`
5. ✅ `buildCurveWithLiquidityWeights()`

Usage is consistent across all functions - just add the optional parameters:

```typescript
// Example with buildCurveWithMarketCap
const config = buildCurveWithMarketCap({
    // ... market cap parameters ...
    taxedSellingEnabled: true,
    bondingCurveExpiryDays: 7,
})

// Example with buildCurveWithLiquidityWeights
const config = buildCurveWithLiquidityWeights({
    // ... liquidity weight parameters ...
    taxedSellingEnabled: false,
    bondingCurveExpiryDays: 0,
})
```

---

## Error Handling

### Taxed Selling

No specific errors - the feature is configured at pool creation and automatically applies during swaps.

### Bonding Curve Expiry

When trading on an expired bonding curve:

```typescript
// Error: BondingCurveExpired (code 6054)
// Message: "Bonding curve has expired"
```

Check expiry before attempting trades:

```typescript
const poolConfig = await client.state.getPoolConfig(configAddress)
const expiryTime = poolConfig.bondingCurveExpiryTime

if (expiryTime > 0) {
    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = currentTime >= Number(expiryTime)
    
    if (isExpired) {
        console.log('Pool has expired, cannot trade')
    } else {
        const timeRemaining = Number(expiryTime) - currentTime
        console.log(`Pool expires in ${timeRemaining} seconds`)
    }
}
```

---

## Best Practices

### Taxed Selling

1. **Communicate Clearly**: Inform users about the 10% sell tax before they trade
2. **UI Display**: Show the total effective fee (base + tax) in your trading interface
3. **Use Case Selection**: Best for anti-dumping, not for high-frequency trading tokens
4. **Consider Impact**: Higher sell fees may reduce liquidity

### Bonding Curve Expiry

1. **Set Reasonable Periods**: Consider your token's trading velocity
2. **Display Countdown**: Show time remaining in your UI
3. **Plan for Expiry**: Have a clear plan for post-expiry (migration, relisting, etc.)
4. **Test Thoroughly**: Verify behavior near expiry time
5. **Document Clearly**: Make expiry time prominent in your token information

---

## FAQ

### Q: Can I change these settings after pool creation?
**A:** No, both `taxedSellingEnabled` and `bondingCurveExpiryDays` are set at config creation and cannot be modified later.

### Q: Does taxed selling affect buy transactions?
**A:** No, the 10% tax only applies to sell transactions (base → quote). Buys are unaffected.

### Q: What happens to my pool after it expires?
**A:** Trading stops, but you can still:
- Withdraw surplus (if NoMigration mode)
- Claim trading fees
- Withdraw leftover tokens

### Q: Can I set expiry to less than 1 day?
**A:** No, the minimum value is 1 day. Use `0` for no expiry.

### Q: Does expiry affect migration?
**A:** No, if the pool reaches its migration threshold before expiry, it will migrate normally. Expiry only affects ongoing trading.

### Q: Are these features audited?
**A:** Yes, these features are part of the on-chain program version 0.1.7 which has been audited.

---

## Support

For questions or issues:
- GitHub Issues: [notdotmarket/dynamic-bonding-curve-sdk](https://github.com/notdotmarket/dynamic-bonding-curve-sdk/issues)
- Documentation: [README.md](./README.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
