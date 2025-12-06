import chalk from 'chalk'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import inquirer from 'inquirer'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'
import { validatePublicKey } from '../utils/helpers.js'

export async function poolInfoCommand() {
    console.log(chalk.bold.cyan('\n📊 Pool Information\n'))

    const wallet = loadWalletFromEnv()
    const connection = getConnection()
    const client = DynamicBondingCurveClient.create(connection, 'confirmed')

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

    console.log(chalk.yellow('\n⏳ Fetching pool data...\n'))

    try {
        const poolData = await client.state.getPool(new PublicKey(poolAddress))
        const configData = await client.state.getPoolConfig(poolData.config)

        console.log(chalk.bold.cyan('🏊 Pool Details:\n'))
        console.log(
            chalk.white(
                `   Pool Address: ${chalk.bold(poolAddress)}`
            )
        )
        console.log(
            chalk.white(
                `   Token Mint: ${chalk.bold(poolData.baseMint.toBase58())}`
            )
        )
        console.log(
            chalk.white(
                `   Config: ${chalk.bold(poolData.config.toBase58())}`
            )
        )
        console.log(
            chalk.white(
                `   Creator: ${chalk.bold(poolData.creator.toBase58())}`
            )
        )

        console.log(chalk.bold.cyan('\n💰 Reserves:\n'))
        console.log(
            chalk.white(
                `   Base Reserve: ${(
                    Number(poolData.baseReserve) /
                    Math.pow(10, configData.tokenDecimal)
                ).toLocaleString()} tokens`
            )
        )
        console.log(
            chalk.white(
                `   Quote Reserve: ${(
                    Number(poolData.quoteReserve) / LAMPORTS_PER_SOL
                ).toFixed(4)} SOL`
            )
        )

        console.log(chalk.bold.cyan('\n⚙️  Configuration:\n'))
        console.log(
            chalk.white(
                `   Migration Option: ${
                    configData.migrationOption === 2
                        ? chalk.yellow('No Migration')
                        : configData.migrationOption === 0
                        ? 'DAMM V1'
                        : 'DAMM V2'
                }`
            )
        )
        console.log(
            chalk.white(
                `   Token Decimals: ${configData.tokenDecimal}`
            )
        )
        console.log(
            chalk.white(
                `   Quote Mint: ${configData.quoteMint.toBase58()}`
            )
        )
        console.log(
            chalk.white(
                `   Fee Claimer: ${configData.feeClaimer.toBase58()}`
            )
        )

        // Get fee breakdown
        try {
            const feeBreakdown = await client.state.getPoolFeeBreakdown(
                new PublicKey(poolAddress)
            )

            console.log(chalk.bold.cyan('\n💸 Fee Breakdown:\n'))
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
            console.log(chalk.gray('\n   (Unable to fetch fee breakdown)'))
        }

        console.log(
            chalk.gray(
                `\n🔗 View on Explorer: https://explorer.solana.com/address/${poolAddress}?cluster=${
                    process.env.NETWORK || 'devnet'
                }\n`
            )
        )
    } catch (error: any) {
        console.error(
            chalk.red('\n❌ Failed to fetch pool data:'),
            error.message
        )
    }
}
