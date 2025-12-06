# Dynamic Bonding Curve CLI

A comprehensive command-line interface for launching, trading, and managing tokens on the Dynamic Bonding Curve protocol.

## Features

- 🔧 **Create Configs** - Launch new pool configurations with customizable parameters
- 🏊 **Create Pools** - Deploy new token pools with automatic mint creation
- 💱 **Swap Tokens** - Buy and sell tokens with real-time quotes
- 💸 **Withdraw Fees** - Claim trading fees and surplus (NoMigration pools)
- 📊 **Pool Information** - View detailed pool stats and reserves

## Installation

```bash
cd cli
bun install
```

## Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set your private key:

```env
# Solana RPC URL
RPC_URL=https://api.devnet.solana.com

# Your wallet private key (base58 encoded)
PRIVATE_KEY=your_base58_private_key_here

# Network (mainnet-beta or devnet)
NETWORK=devnet
```

### Getting Your Private Key

To export your private key in base58 format:

**From Phantom/Solflare:**
1. Export your private key from your wallet
2. Convert to base58 using this Node.js command:

```javascript
import bs58 from 'bs58'
const secretKey = new Uint8Array([/* your secret key array */])
console.log(bs58.encode(secretKey))
```

**From Solana CLI:**
```bash
solana-keygen pubkey ~/.config/solana/id.json --outfile keypair.json
cat keypair.json | jq -r 'map(tostring) | join(",")'
# Then convert the array to base58 using the method above
```

## Usage

Run the CLI:

```bash
bun run dev
```

Or build and run:

```bash
bun run build
./dist/index.js
```

## Available Commands

### 1. Create Config

Creates a new pool configuration with customizable parameters:

- Total token supply
- Initial and migration market caps
- Migration option (DAMM V1, DAMM V2, or NoMigration)
- Token decimals (6 or 9)
- Base fees and dynamic fees
- LP percentages for partner/creator
- Trading fee percentages
- **NoMigration surplus distribution** (partner/creator/protocol %)

The config uses `buildCurveWithLiquidityWeights` with exponential liquidity distribution (1.2^i for i=0 to 15).

**Saved to:** `configs.json`

### 2. Create Pool

Launches a new token pool:

- Select from saved configs or enter manually
- Automatically creates token mint
- Set token name, symbol, and metadata URI
- Optional first buy after pool creation

**Saved to:** `pools.json`

### 3. Swap Tokens

Buy or sell tokens on any pool:

- **Buy**: Swap SOL for tokens
- **Sell**: Swap tokens for SOL
- Real-time quote with slippage protection
- Automatic transaction confirmation

### 4. Withdraw Fees/Surplus

Withdraw accumulated fees and surplus:

**NoMigration Pools:**
- Creator Surplus (Quote tokens)
- Partner Surplus (Quote tokens)
- Partner Base tokens (NoMigration only)

**All Pools:**
- Creator Trading Fees (Base + Quote)
- Partner Trading Fees (Base + Quote)

### 5. View Pool Info

Display detailed pool information:

- Pool address and token mint
- Base and quote reserves
- Migration configuration
- Fee breakdown (creator/partner/protocol)
- Link to Solana Explorer

## Data Storage

The CLI saves data locally for convenience:

- **configs.json** - Created pool configurations
- **pools.json** - Deployed pools with metadata

These files allow you to quickly access your configs and pools without manually entering addresses.

## Example Workflow

1. **Create a Config**
   ```
   → Choose "Create Config"
   → Set total supply: 1,000,000,000
   → Set initial market cap: 5,000 SOL
   → Set migration market cap: 100,000 SOL
   → Choose "No Migration"
   → Set surplus: 40% partner, 40% creator, 20% protocol
   → Config created and saved!
   ```

2. **Create a Pool**
   ```
   → Choose "Create Pool"
   → Select saved config
   → Enter token name: "My Token"
   → Enter symbol: "MTK"
   → Enter metadata URI
   → Optional: Make first buy of 0.1 SOL
   → Pool created and saved!
   ```

3. **Buy Tokens**
   ```
   → Choose "Swap Tokens"
   → Select saved pool
   → Choose "Buy tokens"
   → Enter amount: 1 SOL
   → Confirm swap
   → Tokens received!
   ```

4. **Withdraw Surplus**
   ```
   → Choose "Withdraw Fees/Surplus"
   → Select saved pool
   → Choose "Withdraw Creator Surplus"
   → Surplus withdrawn to your wallet!
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `PRIVATE_KEY` | Base58 encoded private key | Required |
| `NETWORK` | Network name for explorer links | `devnet` |

## Error Handling

The CLI provides clear error messages:

- ❌ Invalid private key format
- ❌ Insufficient balance
- ❌ Pool not found
- ❌ Transaction failed (with logs)

All errors are displayed in red with helpful context.

## Security Notes

⚠️ **Never commit your `.env` file or share your private key!**

- The `.env` file is already in `.gitignore`
- Use a dedicated wallet for testing
- Verify all transactions before confirming

## Development

Built with:
- **Bun** - Fast JavaScript runtime
- **TypeScript** - Type safety
- **Chalk** - Beautiful terminal colors
- **Inquirer** - Interactive prompts
- **@notdotmarket/dynamic-bonding-curve-sdk** - Protocol SDK

## Troubleshooting

**Problem:** "PRIVATE_KEY not found"
- Ensure `.env` file exists in the cli directory
- Verify `PRIVATE_KEY` is set correctly

**Problem:** Transaction fails
- Check your SOL balance (need SOL for rent + fees)
- Verify RPC endpoint is responding
- Check transaction logs in the error output

**Problem:** "Invalid public key"
- Ensure addresses are valid Solana public keys
- Use the saved configs/pools for convenience

## Support

For issues or questions:
- Check the main SDK documentation: `../packages/dynamic-bonding-curve/docs.md`
- Review error logs carefully
- Verify your .env configuration

## License

See LICENSE file for details.
