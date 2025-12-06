# Changelog

All notable changes to the Dynamic Bonding Curve SDK will be documented in this file.


## [1.6.0] - 2025-12-03

### Added

- **Taxed Selling Feature**: Added support for taxed selling mode
  - New `taxedSellingEnabled` field in `BuildCurveBaseParams` (optional, boolean)
  - When enabled, applies 10% trading fee on sell transactions
  - Defaults to `false` (disabled) if not specified
  - Automatically converted to u8 (0 or 1) for on-chain program

- **Bonding Curve Expiry**: Added configurable expiry time for bonding curves
  - New `bondingCurveExpiryDays` field in `BuildCurveBaseParams` (optional, number)
  - Specifies expiry time in days (0 = no expiry, min = 1 day)
  - Defaults to `0` (no expiry) if not specified
  - Prevents trading after expiry time is reached

### Changed

- Updated all `buildCurve*` functions to accept new optional parameters:
  - `buildCurve()` 
  - `buildCurveWithMarketCap()`
  - `buildCurveWithTwoSegments()`
  - `buildCurveWithMidPrice()`
  - `buildCurveWithLiquidityWeights()`

- Updated IDL to latest version (0.1.7) with new program features:

### Fixed

- **Protocol Withdrawal Bug**: Fixed `protocolWithdrawSurplus()` method
  - Now properly creates associated token account (ATA) if it doesn't exist
  - Added pre-instructions to create ATA using `getOrCreateATAInstruction()`
  - Added post-instructions to unwrap SOL for native mint withdrawals
  - Matches the pattern used in `partnerWithdrawSurplus()` method
  - Resolves "AccountNotInitialized" error (Error 3012) when withdrawing protocol fees
  - Added `taxed_selling_enabled` field to ConfigParameters and PoolConfig
  - Added `bonding_curve_expiry_days` field to ConfigParameters
  - Added `bonding_curve_expiry_time` field to PoolConfig (Unix timestamp)

### Notes

- Both new features are **optional** and **backward compatible**
- Existing code will continue to work without modifications
- New fields default to safe values (taxed selling disabled, no expiry)


## [1.5.2] - 2025-12-03

### Documentation

- **README Updates**: Comprehensive documentation refresh
  - Updated package name and branding throughout all documentation
  - Added detailed feature list highlighting v1.5.1+ capabilities
  - Created comprehensive quick start guide with code examples
  - Documented NoMigration surplus percentage configuration with usage examples
  - Added pausable trading code examples
  - Reorganized migration flow sections for better clarity
  - Added version history table and support information
  - Improved formatting with tables for migration fee addresses
  - Updated root README with monorepo structure and development instructions


## [1.5.1] - 2025-12-03

### Added

- **NoMigration Surplus Percentage Configuration**: Added configurable surplus distribution percentages for NoMigration mode
  - New `noMigrationPartnerSurplusPercentage` field in `ConfigParameters` and `BuildCurveBaseParams`
  - New `noMigrationCreatorSurplusPercentage` field in `ConfigParameters` and `BuildCurveBaseParams`
  - New `noMigrationProtocolSurplusPercentage` field in `ConfigParameters` and `BuildCurveBaseParams`
  - These percentages allow custom distribution of surplus in NoMigration mode (must sum to 100)
  - Default values: 0 (uses on-chain default distribution)

### Changed

- Updated all `buildCurve*` functions to accept optional NoMigration surplus percentage parameters
  - `buildCurve()`
  - `buildCurveWithMarketCap()`
  - `buildCurveWithTwoSegments()`
  - `buildCurveWithMidPrice()`
  - `buildCurveWithLiquidityWeights()`
- Multiple withdrawals now supported in NoMigration mode (entities can withdraw multiple times)

## [1.5.0] - 2025-12-02

### Added

- **NoMigration Mode**: Added `NO_MIGRATION = 2` option to `MigrationOption` enum
  - Allows pools without DEX migration requirement
  - Partners, creators, and protocol can withdraw surplus at any time
  - No need to wait for migration threshold
  - 90% of quote reserve is withdrawable (10% buffer remains)
  - Distribution: 80% to partners/creators (split by `creatorTradingFeePercentage`), 20% to protocol

- **Pausable Trading**: Added pausable trading functionality for partners
  - New `PausableMode` enum: `NotPausable = 0`, `Pausable = 1`
  - New `pausableMode` field in `ConfigParameters`
  - New `pauseTrading()` method in `PartnerService` - partner can pause pool trading
  - New `unpauseTrading()` method in `PartnerService` - partner can unpause pool trading
  - Special behavior: When pausable mode is enabled AND trading is paused, partner can withdraw 100% of quote tokens
  - Swap transactions blocked when pool is paused (error: `TradingIsPaused`)

- **Existing Token Pool Support**: Create bonding curve pools with pre-existing tokens
  - New `createPoolWithExistingSplToken()` method in `PoolService` - for SPL tokens
  - New `createPoolWithExistingToken2022()` method in `PoolService` - for Token-2022 tokens
  - Creator must own the existing token mint and have sufficient balance
  - Token decimals must match config `tokenDecimal`
  - Token type must match config `tokenType`

- **Protocol Surplus Withdrawal**: Added protocol withdraw surplus functionality
  - New `protocolWithdrawSurplus()` method in `PartnerService` - allows protocol to withdraw accumulated surplus
  - Protocol receives 20% of surplus in NoMigration mode
  - Automatically uses pool authority for withdrawals

- **New Types**: Added parameter types for new functionality
  - `PauseTradingParams` - for pause trading operation
  - `UnpauseTradingParams` - for unpause trading operation
  - `CreatePoolWithExistingTokenParams` - for existing token pool creation
  - `ProtocolWithdrawSurplusParams` - for protocol surplus withdrawal

- **Program IDs**: Added devnet program ID constant
  - `DYNAMIC_BONDING_CURVE_PROGRAM_ID_DEVNET` - Devnet deployment at `FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H`

### Changed

- Updated IDL to version 0.1.7 with new instructions and account structures
- Updated `VirtualPool` account type to include `isPaused` field
- Updated authority addresses for devnet deployment

### Notes

- NoMigration mode is ideal for projects that don't need DEX listing
- Pausable mode provides emergency controls and flexible exit strategies
- Existing token pools work with NoMigration mode for simplified launches
- All new features are backward compatible with existing pools

## [1.4.9] - 2025-11-29

### Added

- Added `buildCurveWithMidPrice` function to build a custom constant product curve with a mid price option.
- Added `getCurveBreakdown` helper function

## [1.4.8] - 2025-11-23

### Changed

- Moved `getCurrentPoint` in `if` statement to reduce unnecessary RPC calls

## [1.4.7] - 2025-11-23

### Added

- Added an `if` statement to check if the `baseFeeMode` is `RateLimiter` in `swap` and `swap2` endpoints

## [1.4.6] - 2025-10-28

### Added

- Added validation checks for migration fee percentages

### Deprecated

- Endpoint `createDammV2MigrationMetadata` is deprecated as it is no longer needed when migrating a DAMM v2 pool.

### Changed

- Minimum base fee increased from 1bp (0.01%) to 25 bps (0.25%). Affected endpoints: `createConfig`, `createPool`, `createConfigAndPool`, `createConfigAndPoolWithFirstBuy`, `createPoolWithFirstBuy`, `createPoolWithPartnerAndCreatorFirstBuy`
- Migration fee increased from 50% to 99%.

## [1.4.5] - 2025-10-11

### Changed

- Fixed `validateFeeScheduler` function to correctly validate the fee scheduler parameters
- Fixed `getMinBaseFeeNumerator` function to correctly calculate the min base fee numerator

## [1.4.4] - 2025-09-24

### Changed

- Bumped DAMM v2 IDL

## [1.4.3] - 2025-09-19

### Changed

- Fixed `getPoolFeeBreakdown` function to correctly calculate the fee breakdown for a token pool

## [1.4.2] - 2025-09-19

### Added

- `getPoolFeeBreakdown` function to get the fee breakdown for a token pool

## [1.4.1] - 2025-09-15

### Changed

- Removed `feePayer` parameter from `creatorWithdrawMigrationFee` and `partnerWithdrawMigrationFee` functions ++ Fixed functions

## [1.4.0] - 2025-09-09

### Changed

- Fixed `calculateFeeSchedulerEndingBaseFeeBps` function to correctly calculate the ending base fee when `numberOfPeriod` or `periodFrequency` is 0

## [1.3.9] - 2025-09-05

### Changed

- Remove console.log in `getDeltaAmountQuoteUnsigned` and `getDeltaAmountQuoteUnsigned256` functions

## [1.3.8] - 2025-09-03

### Changed

- Remove `U64_MAX` check in `getDeltaAmountQuoteUnsigned` and `getDeltaAmountQuoteUnsigned256` functions

## [1.3.7] - 2025-08-14

### Added

- `swap2` function with `swapMode` parameter
- `swapQuote2` function with `swapMode` parameter
- `prepareSwapAmountParam` helper function
- `getCurrentPoint` helper function

### Changed

- `swapQuote` function now returns `SwapResult` instead of `QuoteResult`
- `getAccountData` function now requires a `commitment` parameter
- Deprecated `swapQuoteExactIn` function
- Deprecated `swapQuoteExactOut` function

## [1.3.6] - 2025-08-08

### Changed

- `withdrawLeftover` function fully permissionless and only `payer` needs to sign.

## [1.3.5] - 2025-07-31

### Added

- Added `MigrationFeeOption === 6` to `MigrationFeeOption` enum for customizable graduated pool fee. Only available for DAMM V2.
- Added new address in `DAMM_V2_MIGRATION_FEE_ADDRESS` fee address array for `MigrationFeeOption === 6`
- Validation checks for `migratedPoolFee` parameter

### Changed

- `buildCurve`, `buildCurveWithMarketCap`, `buildCurveWithTwoSegments`, `buildCurveWithLiquidityWeights` functions now have an optional `migrationFeeOption` parameter

## [1.3.4] - 2025-07-28

### Added

- Added `getDammV1MigrationMetadata` to get DAMM v1 migration states

## [1.3.3] - 2025-07-22

### Changed

- Added compulsory `receiver` parameter for `partner` and `creator` first buy in `createPoolWithPartnerAndCreatorFirstBuy` function
- Added optional `receiver` parameter to `createPoolWithFirstBuy` and `createConfigAndPoolWithFirstBuy` functions

## [1.3.2] - 2025-07-22

### Changed

- Fixed precision issue in `getPoolCurveProgress` function

## [1.3.1] - 2025-07-02

### Added

- `swapQuoteExactOut` function

## [1.3.0] - 2025-07-01

### Added

- Added optional `payer` parameter to `swap` function
- Added `createPoolWithPartnerAndCreatorFirstBuy` function

### Changed

- `createConfigAndPoolWithFirstBuy` and `createPoolWithFirstBuy` function now accepts a `buyer` parameter
- `createPoolWithFirstBuy` function now returns a `Transaction[]` containing `createPoolTx` and a `swapBuyTx` instead of a single `Transaction`

## [1.2.9] - 2025-06-26

### Added

- `TokenUpdateAuthorityOption` enum to have more options for token update authority:
    - CreatorUpdateAuthority (0)
    - Immutable (1)
    - PartnerUpdateAuthority (2)
    - CreatorUpdateAndMintAuthority (3)
    - PartnerUpdateAndMintAuthority (4)

### Changed

- Changed `CollectFeeMode` enums from `OnlyQuote` and `Both` to `QuoteToken` and `OutputToken`

## [1.2.8] - 2025-06-24

### Added

- `getQuoteReserveFromNextSqrtPrice` helper function

## [1.2.7] - 2025-06-19

### Changed

- Fixed `buildCurve` function to correctly calculate with precision for the `migrationBaseSupply`

## [1.2.6] - 2025-06-13

### Changed

- Fixed `getPercentageSupplyOnMigration` function to correctly calculate the percentage of supply on migration

## [1.2.5] - 2025-06-12

### Changed

- Removed `getDammV1MigrationMetadata` and `getDammV2MigrationMetadata` functions

## [1.2.4] - 2025-06-12

### Added

- Support for Rate Limiter mode in base fee configuration
    - Allows partners to configure an alternative base fee mode that increases fee slope based on quote amount
    - Only available when collect fee mode is in quote token only and for buy operations
    - Prevents multiple swap instructions (or CPI) to the same pool in a single transaction

### Breaking Changes

- Maximum `cliff_fee_numerator` increased from 50% (5000 bps / 500_000_000) to 99% (9900 bps / 990_000_000)
- `swap` instruction now requires `instruction_sysvar_account` in remaining_accounts when `is_rate_limiter_applied` is true
- `swap_quote` function updated to handle rate limiter math calculations and 99% max fee
- Base fee parameter structure updated:
    - Renamed `fee_scheduler_mode` to `base_fee_mode`
    - Updated parameter structure:
        ```
        base_fee = {
            cliff_fee_numerator: BN
            first_factor: number // feeScheduler: numberOfPeriod, rateLimiter: feeIncrementBps
            second_factor: BN // feeScheduler: periodFrequency, rateLimiter: maxLimiterDuration
            third_factor: BN // feeScheduler: reductionFactor, rateLimiter: referenceAmount
            base_fee_mode: BaseFeeMode // 0, 1, or 2
        }
        ```
    - New base fee modes:
        - 0 = Fee Scheduler - Linear
        - 1 = Fee Scheduler - Exponential
        - 2 = Rate Limiter
- `buildCurve`, `buildCurveWithMarketCap`, `buildCurveWithTwoSegments`, `buildCurveWithLiquidityWeights` functions now require `baseFeeParams` parameter that can be either configured with `feeSchedulerParam` or `rateLimiterParam`

### Changed

- Updated base fee parameter structure to support both fee scheduler and rate limiter modes
- Enhanced fee calculation logic to accommodate rate limiter functionality

## [1.2.3] - 2025-06-07

### Added

- `swapQuoteExactIn` function

## [1.2.2] - 2025-06-02

### Added

- `claimCreatorTradingFee2` function (without `tempWSolAcc` parameter)
- `claimPartnerTradingFee2` function (without `tempWSolAcc` parameter)

## [1.2.1] - 2025-06-02

### Changed

- Fixed `buildCurveWithMarketCap` function to correctly calculate the `migrationQuoteThreshold`
- Fixed `validateConfigParameters` function to calculate `migrationBaseAmount` correctly

## [1.2.0] - 2025-05-31

### Changed

- `withdrawMigrationFee` function for partner and creator is now called `partnerWithdrawMigrationFee` and `creatorWithdrawMigrationFee`
- `createConfigAndPoolWithFirstBuy` function now returns an object containing the new config transaction, new pool transaction, and first buy transaction

## [1.1.9] - 2025-05-30

### Added

- `transferPoolCreator` function for creator
- `withdrawMigrationFee` function for creator
- `withdrawMigrationFee` function for partner

### Changed

- Removed `buildCurveWithCreatorFirstBuy` function

### Breaking Changes

- `createConfig`'s `ConfigParameters` include `migrationFee` and `tokenUpdateAuthority` configurations.
- All `buildCurve` functions now require `migrationFee` and `tokenUpdateAuthority` configurations.

## [1.1.8] - 2025-05-28

### Added

- `createConfigAndPoolWithFirstBuy` function
- `getTokenType` helper function
- `prepareTokenAccountTx` helper function
- `cleanUpTokenAccountTx` helper function

## [1.1.7] - 2025-05-27

### Changed

- Fixed `buildCurveWithTwoSegments` function to correctly calculate the midSqrtPrice
- Fixed precision error of `buildCurveWithMarketCap` function
- Changed `periodFrequency` calculation in `getLockedVestingParams` function

## [1.1.6] - 2025-05-23

### Added

- `getPoolByBaseMint` function
- `buildCurveWithCreatorFirstBuy` function
- `buildCurveWithTwoSegments` function
- `getLockedVestingParams` function
- `getBaseFeeParams` function
- `DAMM_V1_MIGRATION_FEE_ADDRESS` and `DAMM_V2_MIGRATION_FEE_ADDRESS` fee address array
- `getPriceFromSqrtPrice` function

### Changed

- Optimised `getPoolsQuoteFeesByConfig` and `getPoolsBaseFeesByConfig` functions
- Fixed `getDammV1MigrationMetadata` and `getDammV2MigrationMetadata` functions to derive the metadata address from the pool address
- Removed `buildCurveAndCreateConfig`, `buildCurveAndCreateConfigByMarketCap` and `buildCurveGraphAndCreateConfig` functions
- Added `tempWSolAcc` parameter to `claimPartnerTradingFee` and `claimCreatorTradingFee` functions
- Removed `getTokenDecimal` state function

### Breaking Changes

- Curve building functions are now split into two steps:
    1. Use helper functions to build curve config:
        - `buildCurve`
        - `buildCurveWithMarketCap`
        - `buildCurveWithTwoSegments`
        - `buildCurveWithLiquidityWeights`
        - `buildCurveWithCreatorFirstBuy`
    2. Call `createConfig` with the built config
- Added required `tempWSolAcc` parameter to fee claiming functions when receiver !== creator || feeClaimer

## [1.1.5] - 2025-05-23

### Added

- `createConfigAndPool` function

### Changed

- `docs.md` updated with the correct createPool format
- `CHANGELOG.md` switched to DES format

## [1.1.4] - 2025-05-09

### Added

- New function: `buildCurveGraphAndCreateConfig`
- Added `leftover` parameter to curve building functions

### Changed

- Updated fee claiming functions to support custom receivers

### Breaking Changes

- `buildCurveAndCreateConfig` and `buildCurveAndCreateConfigByMarketCap` now require `leftover` parameter
- `buildCurveGraphAndCreateConfig` uses `liquidityWeights[]` instead of `kFactor`
- Added receiver option in `claimPartnerTradingFee` and `claimCreatorTradingFee`

## [1.1.3] - 2025-05-07

### Changed

- Updated `buildCurveGraphAndCreateConfig` to use `liquidityWeights[]` instead of `kFactor`
- Modified dynamic fee calculation to be 20% of minimum base fee
- Changed `createPoolAndBuy` buyer from `payer` to `poolCreator`

### Added

- Payer option to `claimCreatorTradingFee` and `claimPartnerTradingFee` functions

## [1.1.2] - 2025-04-30

### Added

- New fee options: 4% and 6% graduation fees
- New functions:
    - `creatorWithdrawSurplus`
    - `claimCreatorTradingFee`
    - `createPoolAndBuy`
- New getter functions
- SDK modularization and RPC call optimization

### Changed

- Updated service and getter function calling patterns

### Breaking Changes

- Added required `creatorTradingFeePercentage` parameter to:
    - `createConfig`
    - `buildCurveAndCreateConfig`
    - `buildCurveAndCreateConfigByMarketCap`
- Updated function namespaces:
    - `client.partners` → `client.partner`
    - `client.migrations` → `client.migration`
    - `client.creators` → `client.creator`
    - `client.pools` → `client.pool`
    - `client.getProgram()` → `client.state`
- New pool address derivation functions:
    1. `deriveDbcPoolAddress`
    2. `deriveDammV1PoolAddress`
    3. `deriveDammV2PoolAddress`
