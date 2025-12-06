import { createContext, useContext } from 'react'
import type { DbcContextValue } from '../types'

export const DbcContext = createContext<DbcContextValue | null>(null)

export function useDbcContext(): DbcContextValue {
    const context = useContext(DbcContext)
    if (!context) {
        throw new Error('useDbcContext must be used within a DbcProvider')
    }
    return context
}
