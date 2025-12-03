# Dynamic Bonding Curve SDK

A TypeScript SDK for interacting with the Dynamic Bonding Curve protocol by notdotmarket.

## Overview

This SDK provides a comprehensive set of tools and methods to interact with dynamic bonding curves on Solana. It enables developers to easily create and manage token launch pools with customizable bonding curves, fee structures, migration options, and more.

## Features

- 🚀 **Token Launch Pools** - Create and manage token launches with dynamic bonding curves
- 📈 **Custom Curves** - Build curves with market cap, liquidity weights, or custom segments
- 💰 **Fee Management** - Flexible fee structures with dynamic and scheduled fees
- 🔄 **Migration Options** - Support for DAMM V1, DAMM V2, or NoMigration modes
- ⏸️ **Pausable Trading** - Control trading activity on pools
- 🎯 **Surplus Distribution** - Customizable surplus percentage allocation in NoMigration mode
- 🔒 **Locked Vesting** - Configure token vesting schedules
- 🏦 **Existing Token Support** - Launch pools with pre-existing tokens

## Installation

```bash
npm install @notdotmarket/dynamic-bonding-curve-sdk
# or
pnpm install @notdotmarket/dynamic-bonding-curve-sdk
# or
yarn add @notdotmarket/dynamic-bonding-curve-sdk
# or
bun install @notdotmarket/dynamic-bonding-curve-sdk
```

## Initialization

```typescript
import { Connection } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const client = new DynamicBondingCurveClient(connection, 'confirmed')
```

## Quick Start

### Create a Config

```typescript
import { buildCurve, MigrationOption, TokenDecimal, BaseFeeMode, ActivationType, CollectFeeMode, MigrationFeeOption, TokenType, TokenUpdateAuthorityOption } from '@notdotmarket/dynamic-bonding-curve-sdk'

// Build curve configuration
const curveConfig = buildCurve({
    totalTokenSupply: 1000000000,
    percentageSupplyOnMigration: 10,
    migrationQuoteThreshold: 300,
    migrationOption: MigrationOption.NO_MIGRATION, // NoMigration mode
    tokenBaseDecimal: TokenDecimal.NINE,
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
    dynamicFeeEnabled: true,
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
    tokenType: TokenType.SPL,
    partnerLpPercentage: 0,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 0,
    creatorLockedLpPercentage: 0,
    creatorTradingFeePercentage: 0,
    leftover: 0,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
    migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    // NEW in v1.5.1: Configure surplus distribution for NoMigration mode
    noMigrationPartnerSurplusPercentage: 40,  // 40% to partner
    noMigrationCreatorSurplusPercentage: 40,  // 40% to creator
    noMigrationProtocolSurplusPercentage: 20, // 20% to protocol
})

// Create config transaction
const createConfigTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: wallet.publicKey,
    leftoverReceiver: wallet.publicKey,
    payer: wallet.publicKey,
    quoteMint: NATIVE_MINT,
    ...curveConfig,
})
```

### Create a Pool

```typescript
const createPoolTx = await client.pool.createPool({
    baseMint: tokenMint.publicKey,
    config: configKeypair.publicKey,
    name: 'My Token',
    symbol: 'MTK',
    uri: 'https://example.com/metadata.json',
    payer: wallet.publicKey,
    poolCreator: wallet.publicKey,
})
```

### Trade on the Pool

```typescript
// Buy tokens
const buyTx = await client.pool.swap({
    owner: wallet.publicKey,
    amountIn: new BN(1_000_000_000), // 1 SOL
    minimumAmountOut: new BN(1),
    swapBaseForQuote: false, // Buying base token with quote
    poolAddress: poolAddress,
    referralTokenAccount: null,
})

// Sell tokens
const sellTx = await client.pool.swap({
    owner: wallet.publicKey,
    amountIn: new BN(100_000_000), // 100 tokens
    minimumAmountOut: new BN(1),
    swapBaseForQuote: true, // Selling base token for quote
    poolAddress: poolAddress,
    referralTokenAccount: null,
})
```

## Documentation

For detailed API documentation and usage examples, refer to:
- [API Documentation](./docs.md) - Complete function reference
- [Migration Guide v1.5.0](./MIGRATION_GUIDE_v1.5.0.md) - NoMigration mode, pausable trading, and more
- [Changelog](./CHANGELOG.md) - Version history and updates

## Key Concepts

### Migration Options

The SDK supports three migration modes:

1. **DAMM V1** (`MigrationOption.MET_DAMM_V1`) - Migrate to DAMM V1 DEX when threshold is reached
2. **DAMM V2** (`MigrationOption.MET_DAMM_V2`) - Migrate to DAMM V2 DEX when threshold is reached
3. **NoMigration** (`MigrationOption.NO_MIGRATION`) - No DEX migration, surplus withdrawals enabled

### NoMigration Surplus Distribution (v1.5.1)

When using NoMigration mode, you can configure how surplus is distributed:

```typescript
noMigrationPartnerSurplusPercentage: 40,  // Partner gets 40%
noMigrationCreatorSurplusPercentage: 40,  // Creator gets 40%
noMigrationProtocolSurplusPercentage: 20, // Protocol gets 20%
// Must sum to 100
```

Partners and creators can withdraw their surplus multiple times:

```typescript
// Partner withdrawal
await client.partner.partnerWithdrawSurplus({
    feeClaimer: partnerWallet.publicKey,
    virtualPool: poolAddress,
})

// Creator withdrawal
await client.creator.creatorWithdrawSurplus({
    creator: creatorWallet.publicKey,
    virtualPool: poolAddress,
})
```

### Pausable Trading (v1.5.0)

Control trading activity on your pools:

```typescript
// Pause trading
await client.creator.pausePool({
    creator: wallet.publicKey,
    virtualPool: poolAddress,
})

// Resume trading
await client.creator.unpausePool({
    creator: wallet.publicKey,
    virtualPool: poolAddress,
})
```

## Flow

The generic flow of how Dynamic Bonding Curve works:

### Standard Migration Flow (DAMM V1/V2)

1. Partner creates a config key for the pool with migration settings
2. Creator creates a pool using the config key
3. Pool is tradeable on the Dynamic Bonding Curve
4. When migration quote threshold is met, pool migrates to DAMM V1 or DAMM V2
5. Graduated pool is tradeable on the DEX

### NoMigration Flow (v1.5.0+)

1. Partner creates a config key with `MigrationOption.NO_MIGRATION`
2. Creator creates a pool using the config key
3. Pool is tradeable on the Dynamic Bonding Curve
4. Partner/Creator can withdraw surplus at any time (multiple withdrawals supported)
5. Pool remains on bonding curve indefinitely

## Migration Flows

### DAMM V1

1. `createDammV1MigrationMetadata`
2. `createLocker` (if the token has locked vesting)
3. `migrateToDammV1`
4. `lockDammV1LpToken` (if `creatorLockedLpPercentage` or `partnerLockedLpPercentage` is >0)
5. `claimDammV1LpToken` (if `creatorLpPercentage` or `partnerLpPercentage` is >0)

### DAMM V2

1. `createLocker` (if the token has locked vesting)
2. `migrateToDammV2`

### Test

```bash
bun install
bun test
```

## Networks and Addresses

### Program Addresses

- **Mainnet-beta**: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- **Devnet**: `FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H`

### Graduated DAMM Pool Config Keys

#### DAMM V1 Migration Fee Addresses

Accessible via `DAMM_V1_MIGRATION_FEE_ADDRESS[i]` in the SDK:

| Fee Option | Index | Address |
|-----------|-------|---------|
| FixedBps25 (0.25%) | 0 | `8f848CEy8eY6PhJ3VcemtBDzPPSD4Vq7aJczLZ3o8MmX` |
| FixedBps30 (0.30%) | 1 | `HBxB8Lf14Yj8pqeJ8C4qDb5ryHL7xwpuykz31BLNYr7S` |
| FixedBps100 (1.00%) | 2 | `7v5vBdUQHTNeqk1HnduiXcgbvCyVEZ612HLmYkQoAkik` |
| FixedBps200 (2.00%) | 3 | `EkvP7d5yKxovj884d2DwmBQbrHUWRLGK6bympzrkXGja` |
| FixedBps400 (4.00%) | 4 | `9EZYAJrcqNWNQzP2trzZesP7XKMHA1jEomHzbRsdX8R2` |
| FixedBps600 (6.00%) | 5 | `8cdKo87jZU2R12KY1BUjjRPwyjgdNjLGqSGQyrDshhud` |

#### DAMM V2 Migration Fee Addresses

Accessible via `DAMM_V2_MIGRATION_FEE_ADDRESS[i]` in the SDK:

| Fee Option | Index | Address |
|-----------|-------|---------|
| FixedBps25 (0.25%) | 0 | `7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd` |
| FixedBps30 (0.30%) | 1 | `2nHK1kju6XjphBLbNxpM5XRGFj7p9U8vvNzyZiha1z6k` |
| FixedBps100 (1.00%) | 2 | `Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp` |
| FixedBps200 (2.00%) | 3 | `2c4cYd4reUYVRAB9kUUkrq55VPyy2FNQ3FDL4o12JXmq` |
| FixedBps400 (4.00%) | 4 | `AkmQWebAwFvWk55wBoCr5D62C6VVDTzi84NJuD9H7cFD` |
| FixedBps600 (6.00%) | 5 | `DbCRBj8McvPYHJG1ukj8RE15h2dCNUdTAESG49XpQ44u` |
| Customizable | 6 | `A8gMrEPJkacWkcb3DGwtJwTe16HktSEfvwtuDh2MCtck` |

## Version History

**Current Version**: 1.6.0

- **v1.6.0** - Taxed selling and bonding curve expiry features
- **v1.5.2** - Documentation updates and README refresh
- **v1.5.1** - NoMigration surplus percentage configuration
- **v1.5.0** - NoMigration mode, pausable trading, existing token support, protocol surplus withdrawal
- **v1.4.x** - Dynamic fees, rate limiting, vesting schedules
- **v1.3.x** - DAMM V2 migration support
- **v1.2.x** - Initial public release

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## Support

For issues, questions, or contributions:
- GitHub Issues: [notdotmarket/dynamic-bonding-curve-sdk](https://github.com/notdotmarket/dynamic-bonding-curve-sdk)
- Documentation: [docs.md](./docs.md)

## License

See LICENSE file for details.
