# Test Scripts - Meteora Dynamic Bonding Curve SDK

Comprehensive test scripts for the Meteora Dynamic Bonding Curve SDK v1.5.0 on Solana Devnet.

## 🎯 Features Tested

- ✅ **Config Creation** - NoMigration mode with pausable trading
- ✅ **Token Launch** - Create bonding curve pools
- ✅ **Trading** - Buy and sell tokens with price quotes
- ✅ **Pause/Unpause** - Control trading state
- ✅ **Withdrawals** - Creator and partner surplus withdrawal

## 📋 Prerequisites

1. **Bun** runtime installed
2. **Solana CLI** installed (for airdrops)
3. **Private key** configured in `.env`
4. **Devnet SOL** in your wallet

## 🚀 Quick Start

### 1. Setup Environment

Create a `.env` file with your private key:

```env
SOLANA_PRIVATE_KEY=[64,243,53,35,...]  # Your wallet's secret key as JSON array
```

**Get your private key:**
```bash
# From Solana CLI
solana-keygen export ~/.config/solana/id.json

# Or use the key you already have in .env
```

### 2. Get Devnet SOL

```bash
# Get your wallet address
bun run -e "import {initializeWallet} from './src/walletManager'; console.log(initializeWallet().publicKey.toString())"

# Airdrop SOL
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run Scripts in Order

```bash
# 1. Create config
bun run 1:config

# 2. Launch token
bun run 2:token

# 3. Trade tokens (buy & sell)
bun run 3:trade

# 4. Test pause/unpause
bun run 4:pause

# 5. Withdraw surplus
bun run 5:withdraw
```

**Or run all at once:**
```bash
bun run all
```

## 📜 Scripts Overview

### Script 1: Create Config (`1-create-config.ts`)

Creates a bonding curve configuration with:
- **NoMigration mode** - No DEX migration required
- **Pausable trading** - Can pause/unpause anytime
- **50/50 fee split** - Between creator and partner
- **SPL token** support

**Output:** `data/config.json`

```bash
bun run 1:config
```

**Expected Output:**
```
✅ Config created successfully!
   Config Address: <ADDRESS>
   Partner Address: <ADDRESS>
   Migration Mode: NoMigration
   Pausable: Yes
```

### Script 2: Launch Token (`2-create-token.ts`)

Launches a new token on the bonding curve:
- Creates SPL token mint
- Initializes pool with reserves
- Sets up metadata

**Requires:** `data/config.json`  
**Output:** `data/token.json`

```bash
bun run 2:token
```

**Expected Output:**
```
✅ Token launched successfully!
   Token Mint: <ADDRESS>
   Pool Address: <ADDRESS>
   Name: Test Token
   Symbol: TEST
```

### Script 3: Trade Tokens (`3-trade-tokens.ts`)

Demonstrates buying and selling:
- Gets price quotes
- Buys tokens with SOL
- Sells 50% of tokens
- Shows price impact and fees

**Requires:** `data/config.json`, `data/token.json`

```bash
bun run 3:trade
```

**Expected Output:**
```
💰 BUYING TOKENS
   Expected tokens: 1000.000000 TEST
   Fee: 0.001000000 SOL

💸 SELLING TOKENS
   Expected SOL: 0.048500000
   
✅ Trading completed successfully!
```

### Script 4: Pause/Unpause (`4-pause-unpause.ts`)

Tests trading controls:
- Pauses trading (blocks all swaps)
- Tests that swaps fail while paused
- Unpauses trading
- Enables 100% withdrawal when paused

**Requires:** `data/config.json`, `data/token.json`  
**Note:** Only partner (fee claimer) can pause/unpause

```bash
bun run 4:pause
```

**Expected Output:**
```
⏸️  PAUSING TRADING
✅ Trading paused successfully!
⚠️  All swap transactions will now be blocked.

🧪 TESTING SWAP WHILE PAUSED
✅ EXPECTED: Swap blocked as expected!

▶️  UNPAUSING TRADING
✅ Trading unpaused successfully!
```

### Script 5: Creator Withdraw (`5-creator-withdraw.ts`)

Withdraws creator's surplus share:
- Shows available surplus amounts
- Withdraws creator's share (based on fee percentage)
- Demonstrates NoMigration (withdraw anytime)
- Shows distribution: 80% to creator/partner, 20% to protocol

**Requires:** `data/config.json`, `data/token.json`  
**Note:** Run trading script first to generate surplus

```bash
bun run 5:withdraw
```

**Expected Output:**
```
💰 CREATOR WITHDRAWING SURPLUS
   Creator Surplus: 0.040000000 SOL
   Amount Received: +0.039950000 SOL

✅ Creator withdrawal completed!
📋 Key Points:
   - NoMigration mode allows withdrawals anytime
   - 90% of quote reserve is withdrawable
   - Creator gets 50% of the 80% share
```

## 📊 Data Files

All scripts save data to `test-script/data/`:

- **`config.json`** - Config address, partner info, parameters
- **`token.json`** - Token mint, pool address, metadata

These files are automatically created and used by subsequent scripts.

## 🔧 Configuration

Edit `src/config.ts` to customize:

```typescript
export const CONFIG = {
    RPC_URL: 'https://api.devnet.solana.com',
    COMMITMENT: 'confirmed',
    
    TOKEN: {
        TOTAL_SUPPLY: 1_000_000_000,
        INITIAL_MARKET_CAP: 5000,
        MIGRATION_MARKET_CAP: 1_000_000,
        NAME: 'Test Token',
        SYMBOL: 'TEST',
    },
    
    TRADING: {
        BUY_AMOUNT_SOL: 0.1,
        SLIPPAGE_BPS: 500, // 5%
    },
};
```

## 🐛 Troubleshooting

### "Insufficient balance"
```bash
solana airdrop 2 <YOUR_ADDRESS> --url devnet
```

### "Config file not found"
Run scripts in order: 1 → 2 → 3 → 4 → 5

### "Pool not found"
Wait a few seconds after creating pool, then retry

### "Trading is paused" error
Run unpause script: `bun run 4:pause`

### "No surplus available"
Run trading script first: `bun run 3:trade`

## 📖 SDK Features Demonstrated

### NoMigration Mode
- No DEX migration threshold required
- Withdraw surplus anytime
- 90% of reserves available (10% buffer)
- 80/20 split between users and protocol

### Pausable Trading
- Partner can pause trading anytime
- All swaps blocked when paused
- 100% withdrawal allowed when paused
- Partner can unpause to resume trading

### Dynamic Fees
- Configurable fee schedules
- Creator/partner fee splits
- Protocol fees
- Trading fee collection

## 🔗 Links

- [SDK Documentation](../packages/dynamic-bonding-curve/docs.md)
- [Migration Guide](../packages/dynamic-bonding-curve/MIGRATION_GUIDE_v1.5.0.md)
- [Examples](../packages/dynamic-bonding-curve/EXAMPLES_v1.5.0.md)
- [Solscan Devnet](https://solscan.io/?cluster=devnet)

## 📝 Notes

- All scripts run on **Solana Devnet**
- Requires ~2 SOL for all tests
- Data saved to `data/` directory
- Transaction links printed for verification
- Uses wallet from `SOLANA_PRIVATE_KEY` env var

## 🎓 Learning Path

1. **Start here:** Run script 1 to understand config creation
2. **Token launch:** Script 2 shows pool initialization
3. **Trading:** Script 3 demonstrates swap mechanics
4. **Controls:** Script 4 shows pause/unpause flow
5. **Withdrawals:** Script 5 demonstrates NoMigration mode

Each script includes detailed logging and error handling to help you understand the SDK.

## 🤝 Support

For issues or questions:
- Check the [SDK documentation](../packages/dynamic-bonding-curve/docs.md)
- Review [examples](../packages/dynamic-bonding-curve/EXAMPLES_v1.5.0.md)
- Verify Devnet SOL balance
- Check transaction signatures on Solscan

