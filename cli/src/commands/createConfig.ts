import chalk from 'chalk'
import {
    DynamicBondingCurveClient,
    buildCurveWithLiquidityWeights,
    MigrationOption,
    TokenDecimal,
    BaseFeeMode,
    ActivationType,
    CollectFeeMode,
    MigrationFeeOption,
    TokenType,
    TokenUpdateAuthorityOption,
} from '@notdotmarket/dynamic-bonding-curve-sdk'
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import inquirer from 'inquirer'
import Decimal from 'decimal.js'
import BN from 'bn.js'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'

export async function createConfigCommand() {
    console.log(chalk.bold.cyan('\n🔧 Create New Pool Configuration\n'))

    const wallet = loadWalletFromEnv()
    const connection = getConnection()
    const client = DynamicBondingCurveClient.create(connection, 'confirmed')

    // Get balance
    const balance = await connection.getBalance(wallet.publicKey)
    console.log(
        chalk.white(
            `💰 Wallet Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`
        )
    )

    // Collect configuration parameters
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'totalTokenSupply',
            message: 'Total token supply:',
            default: '1000000000',
        },
        {
            type: 'input',
            name: 'initialMarketCap',
            message: 'Initial market cap (in SOL):',
            default: '10',
        },
    ])

    // Second prompt for migration market cap
    const migrationAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'migrationMarketCap',
            message: 'Migration market cap (in SOL):',
            default: '150',
        },
    ])

    // Third prompt for remaining config
    const configAnswers = await inquirer.prompt([
        {
            type: 'list',
            name: 'migrationOption',
            message: 'Migration option:',
            choices: [
                { name: 'DAMM V2', value: MigrationOption.MET_DAMM_V2 },
                { name: 'No Migration', value: MigrationOption.NO_MIGRATION },
            ],
            default: MigrationOption.NO_MIGRATION,
        },
        {
            type: 'list',
            name: 'tokenDecimal',
            message: 'Token decimals:',
            choices: [
                { name: '6 decimals', value: TokenDecimal.SIX },
                { name: '9 decimals', value: TokenDecimal.NINE },
            ],
            default: TokenDecimal.NINE,
        },
        {
            type: 'input',
            name: 'quoteMint',
            message: 'Quote mint address (SOL = So11111111111111111111111111111111111111112):',
            default: 'So11111111111111111111111111111111111111112',
        },
        {
            type: 'input',
            name: 'baseFeeBps',
            message: 'Base fee (in basis points, 100 = 1%):',
            default: '100',
        },
        {
            type: 'confirm',
            name: 'dynamicFeeEnabled',
            message: 'Enable dynamic fees?',
            default: true,
        },
        {
            type: 'list',
            name: 'tokenUpdateAuthority',
            message: 'Token update authority:',
            choices: [
                { name: 'Immutable (No one can update)', value: TokenUpdateAuthorityOption.Immutable },
                { name: 'Creator Update Authority', value: TokenUpdateAuthorityOption.CreatorUpdateAuthority },
                { name: 'Partner Update Authority', value: TokenUpdateAuthorityOption.PartnerUpdateAuthority },
                { name: 'Creator Update and Mint Authority', value: TokenUpdateAuthorityOption.CreatorUpdateAndMintAuthority },
                { name: 'Partner Update and Mint Authority', value: TokenUpdateAuthorityOption.PartnerUpdateAndMintAuthority },
            ],
            default: TokenUpdateAuthorityOption.Immutable,
        },
        {
            type: 'confirm',
            name: 'configureLpPercentages',
            message: 'Configure LP percentages? (Skip to use defaults: all 0)',
            default: false,
        },
    ])

    // Conditionally ask for LP percentages
    if (configAnswers.configureLpPercentages) {
        const lpAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'partnerLpPercentage',
                message: 'Partner LP percentage (0-100, % of LP tokens given to partner):',
                default: '0',
            },
            {
                type: 'input',
                name: 'creatorLpPercentage',
                message: 'Creator LP percentage (0-100):',
                default: '0',
            },
            {
                type: 'input',
                name: 'partnerLockedLpPercentage',
                message: 'Partner locked LP percentage (0-100, WARNING: High values reduce available liquidity):',
                default: '0',
            },
            {
                type: 'input',
                name: 'creatorLockedLpPercentage',
                message: 'Creator locked LP percentage (0-100, WARNING: High values reduce available liquidity):',
                default: '0',
            },
            {
                type: 'input',
                name: 'creatorTradingFeePercentage',
                message: 'Creator trading fee percentage (0-100):',
                default: '0',
            },
        ])
        Object.assign(configAnswers, lpAnswers)
    } else {
        // Set default values when skipped
        Object.assign(configAnswers, {
            partnerLpPercentage: '0',
            creatorLpPercentage: '0',
            partnerLockedLpPercentage: '0',
            creatorLockedLpPercentage: '0',
            creatorTradingFeePercentage: '0',
        })
    }

    // Merge all answers
    const allAnswers = { ...answers, ...migrationAnswers, ...configAnswers }

    // Additional questions for NoMigration mode
    if (allAnswers.migrationOption === MigrationOption.NO_MIGRATION) {
        // First two questions
        const surplusAnswers: any = await inquirer.prompt([
            {
                type: 'input',
                name: 'noMigrationPartnerSurplusPercentage',
                message: 'Partner surplus percentage (0-100):',
                default: '40',
            },
            {
                type: 'input',
                name: 'noMigrationCreatorSurplusPercentage',
                message: 'Creator surplus percentage (0-100):',
                default: '40',
            },
        ])

        // Third question with validation based on previous answers
        const protocolAnswer = await inquirer.prompt([
            {
                type: 'input',
                name: 'noMigrationProtocolSurplusPercentage',
                message: 'Protocol surplus percentage (0-100):',
                default: '20',
            },
        ])

        Object.assign(allAnswers, surplusAnswers, protocolAnswer)
    }

    console.log(chalk.yellow('\n⏳ Building curve configuration...\n'))

    // Build liquidity weights (exponential growth)
    const liquidityWeights: number[] = []
    for (let i = 0; i < 16; i++) {
        liquidityWeights[i] = new Decimal(1.2).pow(new Decimal(i)).toNumber()
    }

    // Build curve configuration
    const curveConfig = buildCurveWithLiquidityWeights({
            totalTokenSupply: Number(allAnswers.totalTokenSupply),
            initialMarketCap: Number(allAnswers.initialMarketCap),
            migrationMarketCap: Number(allAnswers.migrationMarketCap),
            migrationOption: allAnswers.migrationOption,
            tokenBaseDecimal: allAnswers.tokenDecimal,
            tokenQuoteDecimal: TokenDecimal.NINE, // SOL is always 9 decimals
            lockedVestingParam: {
                totalLockedVestingAmount: 0,
                numberOfVestingPeriod: 0,
                cliffUnlockAmount: 0,
                totalVestingDuration: 0,
                cliffDurationFromMigrationTime: 0,
            },
            baseFeeParams: {
                baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
                feeSchedulerParam: {
                    startingFeeBps: Number(allAnswers.baseFeeBps),
                    endingFeeBps: Number(allAnswers.baseFeeBps),
                    numberOfPeriod: 0,
                    totalDuration: 0,
                },
            },
            dynamicFeeEnabled: allAnswers.dynamicFeeEnabled,
            activationType: ActivationType.Timestamp,
            collectFeeMode: CollectFeeMode.QuoteToken,
            migrationFeeOption: MigrationFeeOption.FixedBps25,
            tokenType: TokenType.SPL,
            partnerLpPercentage: Number((allAnswers as any).partnerLpPercentage) || 100,
            creatorLpPercentage: Number((allAnswers as any).creatorLpPercentage) || 0,
            partnerLockedLpPercentage: 0,
            creatorLockedLpPercentage: 0,
            creatorTradingFeePercentage: Number((allAnswers as any).creatorTradingFeePercentage) || 0,
            leftover: 1000,
            liquidityWeights,
            tokenUpdateAuthority: allAnswers.tokenUpdateAuthority,
            migrationFee: {
                feePercentage: 0,
                creatorFeePercentage: 0,
            },
            ...(allAnswers.migrationOption === MigrationOption.NO_MIGRATION && {
                noMigrationPartnerSurplusPercentage: Number(
                    (allAnswers as any).noMigrationPartnerSurplusPercentage
                ),
                noMigrationCreatorSurplusPercentage: Number(
                    (allAnswers as any).noMigrationCreatorSurplusPercentage
                ),
                noMigrationProtocolSurplusPercentage: Number(
                    (allAnswers as any).noMigrationProtocolSurplusPercentage
                ),
            }),
        })

    // Generate config keypair
    const configKeypair = Keypair.generate()

    console.log(chalk.yellow('📝 Creating configuration transaction...\n'))

    // Create config transaction
    const transaction = await client.partner.createConfig({
        config: configKeypair.publicKey,
        feeClaimer: wallet.publicKey,
        leftoverReceiver: wallet.publicKey,
        payer: wallet.publicKey,
        quoteMint: new PublicKey(allAnswers.quoteMint),
        ...curveConfig,
    })

    // Sign and send transaction
    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
    ).blockhash

    transaction.sign(wallet, configKeypair)

    console.log(chalk.yellow('🚀 Sending transaction...\n'))

    const signature = await connection.sendRawTransaction(
        transaction.serialize()
    )
    await connection.confirmTransaction(signature, 'confirmed')

    console.log(chalk.green('\n✅ Configuration created successfully!\n'))
    console.log(
        chalk.cyan('📋 Configuration Details:')
    )
    console.log(
        chalk.white(
            `   Config Address: ${chalk.bold(
                configKeypair.publicKey.toBase58()
            )}`
        )
    )
    console.log(
        chalk.white(
            `   Transaction: https://explorer.solana.com/tx/${signature}?cluster=${
                process.env.NETWORK || 'devnet'
            }`
        )
    )
    console.log(
        chalk.white(
            `   Migration: ${
                allAnswers.migrationOption === MigrationOption.NO_MIGRATION
                    ? chalk.yellow('No Migration')
                    : 'DAMM V2'
            }`
        )
    )
    console.log(
        chalk.white(
            `   Base Fee: ${allAnswers.baseFeeBps} bps (${
                Number(allAnswers.baseFeeBps) / 100
            }%)`
        )
    )
    console.log(
        chalk.white(
            `   Dynamic Fees: ${
                allAnswers.dynamicFeeEnabled ? chalk.green('Enabled') : chalk.red('Disabled')
            }`
        )
    )

    // Save config address to file for later use
    const configData = {
        address: configKeypair.publicKey.toBase58(),
        createdAt: new Date().toISOString(),
        migrationOption: allAnswers.migrationOption,
        quoteMint: allAnswers.quoteMint,
    }

    const fs = await import('fs')
    const configsFile = './configs.json'
    let configs = []

    try {
        const existingData = fs.readFileSync(configsFile, 'utf-8')
        configs = JSON.parse(existingData)
    } catch {
        // File doesn't exist yet
    }

    configs.push(configData)
    fs.writeFileSync(
        configsFile,
        JSON.stringify(configs, null, 2)
    )

    console.log(
        chalk.gray(
            `\n💾 Config saved to ${configsFile}`
        )
    )
}
