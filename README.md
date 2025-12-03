# Dynamic Bonding Curve SDK (Monorepo)

## Overview

This monorepo contains the Dynamic Bonding Curve TypeScript SDK for Solana token launches with customizable bonding curves, fee structures, and migration options.

- [Dynamic Bonding Curve SDK](./packages/dynamic-bonding-curve/README.md)

## Features

- 🚀 **Token Launch Pools** - Create and manage token launches with dynamic bonding curves
- 📈 **Custom Curves** - Build curves with market cap, liquidity weights, or custom segments
- 💰 **Fee Management** - Flexible fee structures with dynamic and scheduled fees
- 🔄 **Migration Options** - Support for DAMM V1, DAMM V2, or NoMigration modes
- ⏸️ **Pausable Trading** - Control trading activity on pools (v1.5.0+)
- 🎯 **Surplus Distribution** - Customizable surplus percentage allocation in NoMigration mode (v1.5.1+)
- 🔒 **Locked Vesting** - Configure token vesting schedules
- 🏦 **Existing Token Support** - Launch pools with pre-existing tokens

## Installation

### Dynamic Bonding Curve SDK

```bash
npm install @notdotmarket/dynamic-bonding-curve-sdk
# or
pnpm install @notdotmarket/dynamic-bonding-curve-sdk
# or
yarn add @notdotmarket/dynamic-bonding-curve-sdk
# or
bun install @notdotmarket/dynamic-bonding-curve-sdk
```

**Current Version**: 1.5.1

## Quick Start

```typescript
import { Connection } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const client = new DynamicBondingCurveClient(connection, 'confirmed')

// Create config, pools, and start trading!
// See package README for detailed examples
```

## Usage

### Dynamic Bonding Curve SDK

For comprehensive documentation:
- [Package README](./packages/dynamic-bonding-curve/README.md) - Getting started and examples
- [API Documentation](./packages/dynamic-bonding-curve/docs.md) - Complete function reference
- [Migration Guide v1.5.0](./packages/dynamic-bonding-curve/MIGRATION_GUIDE_v1.5.0.md) - NoMigration mode and new features
- [Changelog](./packages/dynamic-bonding-curve/CHANGELOG.md) - Version history

## Development

This is a Turborepo monorepo using Bun as the package manager.

### Setup

```bash
bun install
```

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

## Networks

- **Mainnet Program**: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- **Devnet Program**: `FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H`

## Support

For issues, questions, or contributions:
- GitHub: [notdotmarket/dynamic-bonding-curve-sdk](https://github.com/notdotmarket/dynamic-bonding-curve-sdk)

## License

See LICENSE file for details.
