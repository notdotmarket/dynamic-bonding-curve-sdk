import { Connection, PublicKey } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import BN from 'bn.js'

export interface DbcContextValue {
    connection: Connection
    client: DynamicBondingCurveClient
}

export enum SwapMode {
    ExactIn = 0,
    PartialFill = 1,
    ExactOut = 2,
}

export interface SwapParams {
    pool: PublicKey
    owner: PublicKey
    amountIn: BN
    minimumAmountOut: BN
    swapBaseForQuote: boolean
    referralTokenAccount?: PublicKey | null
}

export interface SwapQuoteParams {
    poolAddress: PublicKey
    amountIn: BN
    swapBaseForQuote: boolean
    slippageBps?: number
    hasReferral?: boolean
}

export type SwapQuote2Params = {
    poolAddress: PublicKey
    swapBaseForQuote: boolean
    slippageBps?: number
    hasReferral?: boolean
} & (
    | {
          swapMode: SwapMode.ExactIn
          amountIn: BN
      }
    | {
          swapMode: SwapMode.PartialFill
          amountIn: BN
      }
    | {
          swapMode: SwapMode.ExactOut
          amountOut: BN
      }
)

export interface PoolInfoResult {
    pool: any
    config: any
}

export interface FeeBreakdownResult {
    creator: {
        unclaimedBaseFee: BN
        unclaimedQuoteFee: BN
    }
    partner: {
        unclaimedBaseFee: BN
        unclaimedQuoteFee: BN
    }
}

export interface WithdrawParams {
    pool: PublicKey
    type: 'creatorSurplusQuote' | 'partnerSurplusQuote' | 'partnerSurplusBase' | 'creatorTradingFee' | 'partnerTradingFee'
    owner: PublicKey
}
