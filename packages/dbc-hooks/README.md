# @notdotmarket/dbc-hooks

React hooks for the Dynamic Bonding Curve SDK, built with React Query.

## Installation

```bash
bun add @notdotmarket/dbc-hooks @tanstack/react-query
```

## Usage

### Setup Provider

Wrap your app with `DbcProvider` and React Query's `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DbcProvider } from '@notdotmarket/dbc-hooks'
import { Connection } from '@solana/web3.js'

const queryClient = new QueryClient()
const connection = new Connection('https://api.devnet.solana.com')

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DbcProvider connection={connection} commitment="confirmed">
        <YourApp />
      </DbcProvider>
    </QueryClientProvider>
  )
}
```

### Trading Hooks

#### usePoolInfo

Fetch pool and config data:

```tsx
import { usePoolInfo } from '@notdotmarket/dbc-hooks'

function PoolDetails({ poolAddress }) {
  const { data, isLoading, error } = usePoolInfo(poolAddress)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <p>Base Reserve: {data.pool.baseReserve.toString()}</p>
      <p>Quote Reserve: {data.pool.quoteReserve.toString()}</p>
    </div>
  )
}
```

#### useSwapQuote

Get swap quote with slippage using swapQuote (v1) - for exact input swaps:

```tsx
import { useSwapQuote } from '@notdotmarket/dbc-hooks'
import BN from 'bn.js'

function SwapQuote({ poolAddress, amount, isBuy }) {
  const { data, isLoading } = useSwapQuote({
    poolAddress,
    amountIn: new BN(amount),
    swapBaseForQuote: !isBuy, // true for sell, false for buy
    slippageBps: 100, // 1% slippage
    hasReferral: false,
  })
  
  if (isLoading) return <div>Calculating...</div>
  
  return (
    <div>
      <p>You will receive: {data.outputAmount.toString()}</p>
      <p>Trading fee: {data.tradingFee.toString()}</p>
      <p>Minimum output: {data.minimumAmountOut.toString()}</p>
    </div>
  )
}
```

#### useSwapQuote2

Get swap quote using swapQuote2 (v2) - supports ExactIn, ExactOut, and PartialFill modes:

```tsx
import { useSwapQuote2, SwapMode } from '@notdotmarket/dbc-hooks'
import BN from 'bn.js'

// ExactIn: Specify how much you want to swap in
function ExactInQuote({ poolAddress, amount }) {
  const { data } = useSwapQuote2({
    poolAddress,
    swapBaseForQuote: false,
    swapMode: SwapMode.ExactIn,
    amountIn: new BN(amount),
    slippageBps: 100,
    hasReferral: false,
  })

  return <div>Output: {data?.outputAmount.toString()}</div>
}

// ExactOut: Specify how much you want to receive
function ExactOutQuote({ poolAddress, desiredOutput }) {
  const { data } = useSwapQuote2({
    poolAddress,
    swapBaseForQuote: false,
    swapMode: SwapMode.ExactOut,
    amountOut: new BN(desiredOutput),
    slippageBps: 100,
  })

  return <div>Required Input: {data?.inputAmount.toString()}</div>
}

// PartialFill: Allow partial fills if liquidity is insufficient
function PartialFillQuote({ poolAddress, amount }) {
  const { data } = useSwapQuote2({
    poolAddress,
    swapBaseForQuote: false,
    swapMode: SwapMode.PartialFill,
    amountIn: new BN(amount),
    slippageBps: 100,
  })

  return <div>Output: {data?.outputAmount.toString()}</div>
}
```

#### useSwap

Execute swap transactions:

```tsx
import { useSwap } from '@notdotmarket/dbc-hooks'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

function SwapButton({ wallet, poolAddress, amount, quote }) {
  const swap = useSwap()
  
  const handleSwap = async () => {
    try {
      const result = await swap.mutateAsync({
        wallet, // Keypair
        pool: new PublicKey(poolAddress),
        owner: wallet.publicKey,
        amountIn: new BN(amount),
        minimumAmountOut: quote.minimumAmountOut,
        swapBaseForQuote: false, // buy tokens
        referralTokenAccount: null,
      })
      
      console.log('Swap successful:', result.signature)
    } catch (error) {
      console.error('Swap failed:', error)
    }
  }
  
  return (
    <button onClick={handleSwap} disabled={swap.isPending}>
      {swap.isPending ? 'Swapping...' : 'Swap'}
    </button>
  )
}
```

#### useFeeBreakdown

Get unclaimed fees:

```tsx
import { useFeeBreakdown } from '@notdotmarket/dbc-hooks'

function FeeDisplay({ poolAddress }) {
  const { data, isLoading } = useFeeBreakdown(poolAddress)
  
  if (isLoading) return <div>Loading fees...</div>
  
  return (
    <div>
      <h3>Creator Fees</h3>
      <p>Base: {data.creator.unclaimedBaseFee.toString()}</p>
      <p>Quote: {data.creator.unclaimedQuoteFee.toString()}</p>
      
      <h3>Partner Fees</h3>
      <p>Base: {data.partner.unclaimedBaseFee.toString()}</p>
      <p>Quote: {data.partner.unclaimedQuoteFee.toString()}</p>
    </div>
  )
}
```

#### useWithdraw

Withdraw fees and surplus:

```tsx
import { useWithdraw } from '@notdotmarket/dbc-hooks'

function WithdrawButton({ wallet, poolAddress }) {
  const withdraw = useWithdraw()
  
  const handleWithdraw = async (type) => {
    try {
      const result = await withdraw.mutateAsync({
        wallet, // Keypair
        pool: new PublicKey(poolAddress),
        owner: wallet.publicKey,
        type, // 'creatorSurplus' | 'partnerSurplus' | 'partnerBase' | 'creatorTradingFee' | 'partnerTradingFee'
      })
      
      console.log('Withdrawal successful:', result.signature)
    } catch (error) {
      console.error('Withdrawal failed:', error)
    }
  }
  
  return (
    <>
      <button onClick={() => handleWithdraw('creatorTradingFee')}>
        Withdraw Creator Fees
      </button>
      <button onClick={() => handleWithdraw('partnerTradingFee')}>
        Withdraw Partner Fees
      </button>
    </>
  )
}
```

## Available Hooks

### Query Hooks (Read-only)

#### Pool Information
- `usePoolInfo` - Fetch pool and config data for a specific pool
- `usePoolConfig` - Fetch pool configuration by config address
- `usePools` - Fetch all dynamic bonding curve pools
- `usePoolsByConfig` - Fetch all pools linked to a specific config
- `usePoolsByCreator` - Fetch all pools created by a specific address
- `usePoolByBaseMint` - Fetch pool by base token mint address

#### Pool State & Metrics
- `usePoolCurveProgress` - Get bonding curve progress (0-1 ratio of quote reserve to migration threshold)
- `usePoolMetadata` - Fetch pool metadata
- `usePoolMigrationQuoteThreshold` - Get migration quote threshold for a pool

#### Pool Configurations
- `usePoolConfigs` - Fetch all pool configurations
- `usePoolConfigsByOwner` - Fetch pool configs owned by a specific address

#### Fee Information
- `useFeeBreakdown` - Get detailed fee breakdown (claimed/unclaimed for creator and partner)
- `usePoolFeeMetrics` - Get current unclaimed and total fee metrics
- `usePoolsFeesByConfig` - Get fees for all pools linked to a config
- `usePoolsFeesByCreator` - Get fees for all pools by a creator

#### Partner & Migration
- `usePartnerMetadata` - Fetch partner metadata
- `useDammV1MigrationMetadata` - Get DAMM V1 migration metadata
- `useDammV1LockEscrow` - Get DAMM V1 lock escrow details

#### Swap Quotes
- `useSwapQuote` - Calculate swap quotes (v1, exact input)
- `useSwapQuote2` - Calculate swap quotes (v2, supports ExactIn/ExactOut/PartialFill)

### Mutation Hooks (Write operations)
- `useSwap` - Execute swap transactions
- `useWithdraw` - Withdraw fees and surplus

## Usage Examples

### Fetching All Pools

```tsx
import { usePools } from '@notdotmarket/dbc-hooks'

function PoolsList() {
  const { data: pools, isLoading } = usePools()
  
  if (isLoading) return <div>Loading pools...</div>
  
  return (
    <div>
      <h2>All Pools ({pools?.length})</h2>
      {pools?.map((pool) => (
        <div key={pool.publicKey.toString()}>
          <p>Pool: {pool.publicKey.toString()}</p>
          <p>Base Reserve: {pool.account.baseReserve.toString()}</p>
          <p>Quote Reserve: {pool.account.quoteReserve.toString()}</p>
        </div>
      ))}
    </div>
  )
}
```

### Monitoring Curve Progress

```tsx
import { usePoolCurveProgress } from '@notdotmarket/dbc-hooks'

function CurveProgressBar({ poolAddress }) {
  const { data: progress, isLoading } = usePoolCurveProgress(poolAddress)
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h3>Bonding Curve Progress</h3>
      <div style={{ width: '100%', height: 20, background: '#ddd' }}>
        <div 
          style={{ 
            width: `${(progress ?? 0) * 100}%`, 
            height: '100%', 
            background: '#4caf50' 
          }}
        />
      </div>
      <p>{((progress ?? 0) * 100).toFixed(2)}% to migration</p>
    </div>
  )
}
```

### Viewing Pool Fees

```tsx
import { usePoolFeeMetrics } from '@notdotmarket/dbc-hooks'

function PoolFees({ poolAddress }) {
  const { data: metrics, isLoading } = usePoolFeeMetrics(poolAddress)
  
  if (isLoading) return <div>Loading fees...</div>
  
  return (
    <div>
      <h3>Unclaimed Fees</h3>
      <div>
        <h4>Partner</h4>
        <p>Base: {metrics?.current.partnerBaseFee.toString()}</p>
        <p>Quote: {metrics?.current.partnerQuoteFee.toString()}</p>
      </div>
      <div>
        <h4>Creator</h4>
        <p>Base: {metrics?.current.creatorBaseFee.toString()}</p>
        <p>Quote: {metrics?.current.creatorQuoteFee.toString()}</p>
      </div>
    </div>
  )
}
```

### Finding Pools by Creator

```tsx
import { usePoolsByCreator } from '@notdotmarket/dbc-hooks'
import { PublicKey } from '@solana/web3.js'

function CreatorPools({ creatorAddress }) {
  const { data: pools, isLoading } = usePoolsByCreator(
    new PublicKey(creatorAddress)
  )
  
  if (isLoading) return <div>Loading creator pools...</div>
  
  return (
    <div>
      <h2>Pools by Creator</h2>
      <p>Total: {pools?.length}</p>
      {pools?.map((pool) => (
        <div key={pool.publicKey.toString()}>
          <p>{pool.publicKey.toString()}</p>
          <p>Base Mint: {pool.account.baseMint.toString()}</p>
        </div>
      ))}
    </div>
  )
}
```

## Swap Modes (SwapQuote2)

```typescript
enum SwapMode {
  ExactIn = 0,      // Specify exact input amount
  PartialFill = 1,  // Allow partial fills if liquidity insufficient
  ExactOut = 2,     // Specify exact output amount (calculates required input)
}
```

## Features

- ✅ Built with React Query for automatic caching and refetching
- ✅ **SDK Read Functions** - Uses optimized `swapQuote` and `swapQuote2` read functions
- ✅ **Multiple Swap Modes** - Support for ExactIn, ExactOut, and PartialFill
- ✅ TypeScript support with full type safety
- ✅ Automatic query invalidation after mutations
- ✅ Configurable stale times and refetch intervals
- ✅ Optimistic updates
- ✅ Error handling and loading states

## License

MIT
