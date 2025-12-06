import chalk from 'chalk'
import {
    DynamicBondingCurveClient,
    MigrationOption,
} from '@notdotmarket/dynamic-bonding-curve-sdk'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import BN from 'bn.js'
import inquirer from 'inquirer'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'
import { validatePublicKey } from '../utils/helpers.js'

export async function withdrawCommand() {
    console.log(chalk.bold.cyan('\n💸 Withdraw Fees/Surplus\n'))

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

    // Load saved pools
    let savedPools: any[] = []
    try {
        const fs = await import('fs')
        const poolsData = fs.readFileSync('./pools.json', 'utf-8')
        savedPools = JSON.parse(poolsData)
    } catch {
        // No saved pools
    }

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'poolSource',
            message: 'Select pool:',
            choices: [
                ...(savedPools.length > 0
                    ? [{ name: 'Use saved pool', value: 'saved' }]
                    : []),
                { name: 'Enter pool address manually', value: 'manual' },
            ],
        },
    ])

    let poolAddress: string

    if (answers.poolSource === 'saved' && savedPools.length > 0) {
        const poolChoice = await inquirer.prompt([
            {
                type: 'list',
                name: 'pool',
                message: 'Select a pool:',
                choices: savedPools.map((p) => ({
                    name: `${p.name} (${p.symbol}) - ${p.address || p.tokenMint}`,
                    value: p.address || p.tokenMint,
                })),
            },
        ])
        
        // If we have pool address directly, use it. Otherwise derive from token mint
        if (savedPools.find(p => p.address === poolChoice.pool || p.tokenMint === poolChoice.pool)?.address) {
            poolAddress = poolChoice.pool
        } else {
            // Derive pool address from token mint and config
            const selectedPool = savedPools.find(p => p.tokenMint === poolChoice.pool)
            if (!selectedPool) throw new Error('Pool not found')
            
            const programId = new PublicKey('FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H')
            const quoteMint = new PublicKey('So11111111111111111111111111111111111111112') // SOL
            const baseMint = new PublicKey(selectedPool.tokenMint)
            const configPubkey = new PublicKey(selectedPool.config)
            
            const isQuoteMintBiggerThanBaseMint = quoteMint.toBuffer().compare(baseMint.toBuffer()) > 0
            
            const [derivedPoolAddress] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('pool'),
                    configPubkey.toBuffer(),
                    isQuoteMintBiggerThanBaseMint ? quoteMint.toBuffer() : baseMint.toBuffer(),
                    isQuoteMintBiggerThanBaseMint ? baseMint.toBuffer() : quoteMint.toBuffer(),
                ],
                programId
            )
            poolAddress = derivedPoolAddress.toBase58()
        }
    } else {
        const manualPool = await inquirer.prompt([
            {
                type: 'input',
                name: 'poolAddress',
                message: 'Enter pool address:',
                validate: (input) =>
                    validatePublicKey(input) ? true : 'Invalid public key',
            },
        ])
        poolAddress = manualPool.poolAddress
    }

    // Fetch pool data
    console.log(chalk.yellow('\n⏳ Fetching pool data...\n'))
    const poolData = await client.state.getPool(new PublicKey(poolAddress))
    const configData = await client.state.getPoolConfig(poolData.config)

    // Check migration option
    const isNoMigration =
        configData.migrationOption === MigrationOption.NO_MIGRATION

    console.log(chalk.cyan('📊 Pool Information:'))
    console.log(
        chalk.white(
            `   Migration Option: ${
                isNoMigration
                    ? chalk.yellow('No Migration')
                    : 'DAMM V2'
            }`
        )
    )

    // Get fee breakdown
    try {
        const feeBreakdown = await client.state.getPoolFeeBreakdown(
            new PublicKey(poolAddress)
        )

        console.log(chalk.cyan('\n💰 Available Fees:'))
        console.log(
            chalk.white(
                `   Creator Base Fee: ${(
                    Number(feeBreakdown.creator.unclaimedBaseFee) /
                    Math.pow(10, configData.tokenDecimal)
                ).toFixed(6)} tokens`
            )
        )
        console.log(
            chalk.white(
                `   Creator Quote Fee: ${(
                    Number(feeBreakdown.creator.unclaimedQuoteFee) / LAMPORTS_PER_SOL
                ).toFixed(6)} SOL`
            )
        )
        console.log(
            chalk.white(
                `   Partner Base Fee: ${(
                    Number(feeBreakdown.partner.unclaimedBaseFee) /
                    Math.pow(10, configData.tokenDecimal)
                ).toFixed(6)} tokens`
            )
        )
        console.log(
            chalk.white(
                `   Partner Quote Fee: ${(
                    Number(feeBreakdown.partner.unclaimedQuoteFee) / LAMPORTS_PER_SOL
                ).toFixed(6)} SOL`
            )
        )
    } catch (error) {
        console.log(chalk.gray('   (Unable to fetch fee breakdown)'))
    }

    // Determine available withdrawal options
    const withdrawOptions = []

    if (isNoMigration) {
        withdrawOptions.push(
            { name: 'Withdraw Creator Surplus (Quote)', value: 'creator_surplus' },
            { name: 'Withdraw Partner Surplus (Quote)', value: 'partner_surplus' },
            { name: 'Withdraw Partner Base (NoMigration)', value: 'partner_base' }
        )
    }

    withdrawOptions.push(
        { name: 'Withdraw Creator Trading Fee', value: 'creator_trading' },
        { name: 'Withdraw Partner Trading Fee', value: 'partner_trading' }
    )

    const withdrawAnswers = await inquirer.prompt([
        {
            type: 'list',
            name: 'withdrawType',
            message: 'Select withdrawal type:',
            choices: withdrawOptions,
        },
    ])

    console.log(chalk.yellow('\n📝 Creating withdrawal transaction...\n'))

    try {
        let transaction

        switch (withdrawAnswers.withdrawType) {
            case 'creator_surplus':
                transaction = await client.creator.creatorWithdrawSurplus({
                    creator: wallet.publicKey,
                    virtualPool: new PublicKey(poolAddress),
                })
                break

            case 'partner_surplus':
                transaction = await client.partner.partnerWithdrawSurplus({
                    feeClaimer: wallet.publicKey,
                    virtualPool: new PublicKey(poolAddress),
                })
                break

            case 'partner_base':
                transaction = await client.partner.partnerWithdrawBaseNoMigration({
                    feeClaimer: wallet.publicKey,
                    virtualPool: new PublicKey(poolAddress),
                })
                break

            case 'creator_trading':
                transaction = await client.creator.claimCreatorTradingFee({
                    pool: new PublicKey(poolAddress),
                    creator: wallet.publicKey,
                    payer: wallet.publicKey,
                    maxBaseAmount: new BN('18446744073709551615'), // Max u64
                    maxQuoteAmount: new BN('18446744073709551615'), // Max u64
                })
                break

            case 'partner_trading':
                transaction = await client.partner.claimPartnerTradingFee({
                    pool: new PublicKey(poolAddress),
                    feeClaimer: wallet.publicKey,
                    payer: wallet.publicKey,
                    maxBaseAmount: new BN('18446744073709551615'), // Max u64
                    maxQuoteAmount: new BN('18446744073709551615'), // Max u64
                })
                break

            default:
                throw new Error('Invalid withdrawal type')
        }

        transaction.feePayer = wallet.publicKey
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash

        transaction.sign(wallet)

        console.log(chalk.yellow('🚀 Sending transaction...\n'))

        const signature = await connection.sendRawTransaction(
            transaction.serialize()
        )
        await connection.confirmTransaction(signature, 'confirmed')

        console.log(chalk.green('\n✅ Withdrawal completed successfully!\n'))
        console.log(
            chalk.white(
                `   Transaction: https://explorer.solana.com/tx/${signature}?cluster=${
                    process.env.NETWORK || 'devnet'
                }`
            )
        )
    } catch (error: any) {
        console.error(chalk.red('\n❌ Withdrawal failed:'), error.message)
        if (error.logs) {
            console.error(chalk.red('Logs:'), error.logs)
        }
    }
}
