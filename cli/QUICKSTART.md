# Dynamic Bonding Curve CLI - Quick Start Guide

## 🎯 What is this CLI?

A powerful command-line interface for the Dynamic Bonding Curve SDK that allows you to:

1. **Create Configs** - Launch pool configurations with customizable parameters
2. **Create Pools** - Deploy new token pools on Solana
3. **Trade Tokens** - Buy and sell tokens seamlessly  
4. **Withdraw Fees** - Claim trading fees and surplus from NoMigration pools
5. **View Pool Data** - Monitor reserves, fees, and pool status

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd cli
bun install
```

### 2. Configure Environment

Create `.env` file:

```env
RPC_URL=https://api.devnet.solana.com
PRIVATE_KEY=your_base58_private_key_here
NETWORK=devnet
```

**Getting your private key:**

```bash
# From Solana CLI keypair
solana-keygen pubkey ~/.config/solana/id.json
# Export as base58 (see README for conversion)
```

### 3. Run the CLI

```bash
bun run dev
```

## 📋 Features Overview

### 1. Create Config

**What it does:**
- Creates a pool configuration using `buildCurveWithLiquidityWeights`
- Exponential liquidity distribution (1.2^i for i=0..15)
- Configurable migration options (DAMM V1, V2, or NoMigration)
- Set surplus distribution for NoMigration pools

**Inputs:**
- Total token supply
- Initial & migration market caps
- Token decimals (6 or 9)
- Quote mint (SOL or other)
- Base fee (in bps)
- Dynamic fees (on/off)
- LP percentages (partner/creator/locked)
- Trading fee percentages
- **NoMigration**: Surplus split (partner/creator/protocol must = 100%)

**Output:**
- Config address saved to `configs.json`
- Transaction link to explorer

**Example:**
```
Total Supply: 1,000,000,000
Initial MC: 5,000 SOL
Migration MC: 100,000 SOL
Migration: No Migration
Surplus: 40% partner, 40% creator, 20% protocol
→ Config created at: ABC...XYZ
```

---

### 2. Create Pool

**What it does:**
- Deploys a new token with automatic mint creation
- Links to an existing config
- Optional first buy after creation

**Inputs:**
- Config address (from saved or manual)
- Token name, symbol, metadata URI
- Optional: First buy amount (in SOL)

**Output:**
- Pool address saved to `pools.json`
- Token mint address
- Transaction link

**Example:**
```
Config: ABC...XYZ (from saved)
Name: My Token
Symbol: MTK
URI: https://example.com/metadata.json
First Buy: 0.1 SOL
→ Pool created at: DEF...123
→ Token mint: GHI...456
```

---

### 3. Swap Tokens (Buy/Sell)

**What it does:**
- Buy tokens with SOL
- Sell tokens for SOL
- Real-time quote with slippage protection

**Buy Example:**
```
Pool: My Token (MTK)
Direction: Buy
Amount: 1 SOL
Slippage: 1%
→ You will receive: ~50,000 MTK
→ Fee: 0.01 SOL
→ Swap confirmed!
```

**Sell Example:**
```
Pool: My Token (MTK)
Direction: Sell
Amount: 10,000 MTK
Slippage: 1%
→ You will get: ~0.18 SOL
→ Fee: 0.0018 SOL
→ Swap confirmed!
```

---

### 4. Withdraw Fees/Surplus

**What it does:**
- Withdraw trading fees (all pools)
- Withdraw surplus (NoMigration only)
- Withdraw base tokens (NoMigration partner only)

**Options:**

**For NoMigration Pools:**
- ✅ Creator Surplus (Quote) - Withdraw accumulated quote token surplus
- ✅ Partner Surplus (Quote) - Withdraw accumulated quote token surplus
- ✅ Partner Base (NoMigration) - Withdraw accumulated base token fees

**For All Pools:**
- ✅ Creator Trading Fee - Base + Quote tokens
- ✅ Partner Trading Fee - Base + Quote tokens

**Example:**
```
Pool: My Token (MTK)
Type: Partner Surplus
Available: 0.5 SOL

→ Withdrawing...
→ Success! 0.5 SOL sent to your wallet
```

---

### 5. View Pool Info

**What it does:**
- Display comprehensive pool statistics
- View reserves and fees
- Check migration status

**Display:**
```
🏊 Pool Details:
   Pool Address: DEF...123
   Token Mint: GHI...456
   Creator: YOUR_WALLET

💰 Reserves:
   Base Reserve: 757,440,000 tokens
   Quote Reserve: 11.8140 SOL

⚙️ Configuration:
   Migration: No Migration
   Token Decimals: 9
   Fee Claimer: JKL...789

💸 Fee Breakdown:
   Creator Base: 0.000123 tokens
   Creator Quote: 0.029760 SOL
   Partner Base: 0.000456 tokens
   Partner Quote: 0.072000 SOL
   Protocol Base: 0.000234 tokens
   Protocol Quote: 0.014400 SOL
```

## 🎨 CLI Features

### Beautiful Interface
- 🎨 Color-coded output (Chalk)
- ✅ Success/error indicators
- 📊 Formatted numbers and decimals
- 🔗 Explorer links for all transactions

### Smart Defaults
- Saved configs and pools for quick access
- Auto-detected token decimals
- Slippage protection
- Max withdrawal amounts

### Data Persistence
- `configs.json` - All created configs
- `pools.json` - All created pools
- Quick selection from saved items

## 💡 Use Cases

### 1. Token Launch Platform
```bash
1. Create config with NoMigration
2. Create pool for new token
3. Make first buy to seed liquidity
4. Users trade on the pool
5. Withdraw surplus regularly
```

### 2. Testing & Development
```bash
1. Create config with different parameters
2. Create multiple test pools
3. Simulate trading activity
4. Verify fee calculations
5. Test withdrawal mechanisms
```

### 3. Pool Management
```bash
1. View pool info regularly
2. Monitor fee accumulation
3. Withdraw when threshold reached
4. Track trading volume via reserves
```

## 🔐 Security

- ✅ Private key stored in `.env` (never committed)
- ✅ Transaction confirmation required
- ✅ Clear error messages
- ✅ Slippage protection on swaps
- ✅ Balance checks before operations

## 🐛 Troubleshooting

**"PRIVATE_KEY not found"**
→ Create `.env` file and set PRIVATE_KEY

**"Insufficient balance"**
→ Need SOL for rent + transaction fees

**Transaction fails**
→ Check error logs, verify pool exists, check balances

**"Workspace dependency not found"**
→ Run `bun install` from root directory first

## 📚 Additional Resources

- **Main SDK Docs**: `../packages/dynamic-bonding-curve/docs.md`
- **Migration Guide**: `../packages/dynamic-bonding-curve/MIGRATION_GUIDE_v1.5.0.md`
- **Changelog**: `../packages/dynamic-bonding-curve/CHANGELOG.md`

## 🎯 Next Steps

1. Set up your `.env` file
2. Run `bun run dev`
3. Create your first config
4. Launch a test pool
5. Make some trades
6. Withdraw your fees!

Happy launching! 🚀
