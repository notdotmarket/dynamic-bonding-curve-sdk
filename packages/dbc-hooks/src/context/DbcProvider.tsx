import React, { useMemo } from 'react'
import { Connection } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import { DbcContext } from './DbcContext'
import type { DbcContextValue } from '../types'

interface DbcProviderProps {
    children: React.ReactNode
    connection: Connection
    commitment?: 'processed' | 'confirmed' | 'finalized'
}

export function DbcProvider({
    children,
    connection,
    commitment = 'confirmed',
}: DbcProviderProps) {
    const value: DbcContextValue = useMemo(() => {
        const client = DynamicBondingCurveClient.create(connection, commitment)
        return { connection, client }
    }, [connection, commitment])

    return <DbcContext.Provider value={value}>{children}</DbcContext.Provider>
}
