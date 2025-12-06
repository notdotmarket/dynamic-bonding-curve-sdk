#!/usr/bin/env node

import chalk from 'chalk'
import inquirer from 'inquirer'
import { config } from 'dotenv'
import { createConfigCommand } from './src/commands/createConfig.js'
import { createPoolCommand } from './src/commands/createPool.js'
import { swapCommand } from './src/commands/swap.js'
import { withdrawCommand } from './src/commands/withdraw.js'
import { poolInfoCommand } from './src/commands/poolInfo.js'
import { createTokenAndPoolCommand } from './src/commands/createTokenAndPool.js'
import { displayWalletInfo, loadWalletFromEnv } from './src/utils/wallet.js'

// Load environment variables
config()

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.yellow('Dynamic Bonding Curve CLI')}                                 ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Launch, Trade & Manage Tokens on Solana')}                    ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}
`

async function main() {
    console.clear()
    console.log(banner)

    // Verify environment setup
    try {
        const wallet = loadWalletFromEnv()
        displayWalletInfo(wallet)
    } catch (error) {
        // Error already logged in loadWalletFromEnv
        process.exit(1)
    }

    while (true) {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: chalk.cyan('What would you like to do?'),
                choices: [
                    { name: '🔧 Create Config', value: 'createConfig' },
                    { name: '🏊 Create Pool', value: 'createPool' },
                    { name: '🪙 Create Token & Pool (Separate)', value: 'createTokenAndPool' },
                    { name: '💱 Swap Tokens (Buy/Sell)', value: 'swap' },
                    { name: '💸 Withdraw Fees/Surplus', value: 'withdraw' },
                    { name: '📊 View Pool Info', value: 'poolInfo' },
                    { name: '❌ Exit', value: 'exit' },
                ],
            },
        ])

        if (action === 'exit') {
            console.log(chalk.yellow('\n👋 Goodbye!\n'))
            process.exit(0)
        }

        try {
            switch (action) {
                case 'createConfig':
                    await createConfigCommand()
                    break
                case 'createPool':
                    await createPoolCommand()
                    break
                case 'createTokenAndPool':
                    await createTokenAndPoolCommand()
                    break
                case 'swap':
                    await swapCommand()
                    break
                case 'withdraw':
                    await withdrawCommand()
                    break
                case 'poolInfo':
                    await poolInfoCommand()
                    break
            }
        } catch (error: any) {
            console.error(chalk.red('\n❌ Error:'), error.message)
        }

        // Ask if user wants to continue
        const { continue: shouldContinue } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continue',
                message: 'Would you like to perform another action?',
                default: true,
            },
        ])

        if (!shouldContinue) {
            console.log(chalk.yellow('\n👋 Goodbye!\n'))
            process.exit(0)
        }

        console.clear()
        console.log(banner)
        displayWalletInfo(loadWalletFromEnv())
    }
}

main().catch((error) => {
    console.error(chalk.red('\n❌ Fatal Error:'), error.message)
    process.exit(1)
})