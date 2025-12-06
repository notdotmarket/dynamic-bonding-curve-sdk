import chalk from 'chalk'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import inquirer from 'inquirer'
import BN from 'bn.js'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'
import { validatePublicKey, parseAmount } from '../utils/helpers.js'

export async function swapCommand() {
    console.log(chalk.bold.cyan('\n💱 Swap Tokens\n'))

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

    console.log(chalk.cyan('📊 Pool Information:'))
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

    const swapAnswers = await inquirer.prompt([
        {
            type: 'list',
            name: 'direction',
            message: 'Swap direction:',
            choices: [
                { name: 'Buy tokens (SOL → Token)', value: 'buy' },
                { name: 'Sell tokens (Token → SOL)', value: 'sell' },
            ],
        },
        {
            type: 'input',
            name: 'amount',
            message: (answers) =>
                answers.direction === 'buy'
                    ? 'Amount to spend (in SOL):'
                    : 'Amount to sell (in tokens):',
            validate: (input) =>
                !isNaN(Number(input)) && Number(input) > 0
                    ? true
                    : 'Please enter a valid amount',
        },
        {
            type: 'input',
            name: 'slippage',
            message: 'Slippage tolerance (in %):',
            default: '1',
            validate: (input) =>
                !isNaN(Number(input)) && Number(input) >= 0 && Number(input) <= 100
                    ? true
                    : 'Please enter a valid percentage',
        },
    ])

    const isBuy = swapAnswers.direction === 'buy'
    const amountIn = isBuy
        ? parseAmount(swapAnswers.amount, 9) // SOL has 9 decimals
        : parseAmount(swapAnswers.amount, configData.tokenDecimal)

    console.log(chalk.yellow('\n📝 Creating swap transaction...\n'))

    try {
        // Get swap quote
        const quote = await client.pool.swapQuote({
            virtualPool: poolData,
            config: configData,
            swapBaseForQuote: !isBuy,
            amountIn: amountIn,
            slippageBps: Math.floor(Number(swapAnswers.slippage) * 100),
            hasReferral: false,
            currentPoint: new BN(Date.now()),
        })

        console.log(chalk.cyan('💰 Quote:'))
        console.log(
            chalk.white(
                `   You will ${isBuy ? 'receive' : 'get'}: ${
                    isBuy
                        ? (
                              Number(quote.outputAmount) /
                              Math.pow(10, configData.tokenDecimal)
                          ).toLocaleString()
                        : (Number(quote.outputAmount) / LAMPORTS_PER_SOL).toFixed(4)
                } ${isBuy ? 'tokens' : 'SOL'}`
            )
        )
        console.log(
            chalk.white(`   Fee: ${(Number(quote.tradingFee) / LAMPORTS_PER_SOL).toFixed(6)} SOL`)
        )

        const confirmAnswers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Proceed with swap?',
                default: true,
            },
        ])

        if (!confirmAnswers.confirm) {
            console.log(chalk.yellow('\n❌ Swap cancelled\n'))
            return
        }

        // Create swap transaction
        const swapTx = await client.pool.swap({
            owner: wallet.publicKey,
            amountIn: amountIn,
            minimumAmountOut: quote.minimumAmountOut,
            swapBaseForQuote: !isBuy,
            pool: new PublicKey(poolAddress),
            referralTokenAccount: null,
        })

        swapTx.feePayer = wallet.publicKey
        swapTx.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash

        swapTx.sign(wallet)

        console.log(chalk.yellow('🚀 Sending transaction...\n'))

        const signature = await connection.sendRawTransaction(
            swapTx.serialize()
        )
        await connection.confirmTransaction(signature, 'confirmed')

        console.log(chalk.green('\n✅ Swap completed successfully!\n'))
        console.log(
            chalk.white(
                `   Transaction: https://explorer.solana.com/tx/${signature}?cluster=${
                    process.env.NETWORK || 'devnet'
                }`
            )
        )
    } catch (error: any) {
        console.error(chalk.red('\n❌ Swap failed:'), error.message)
        if (error.logs) {
            console.error(chalk.red('Logs:'), error.logs)
        }
    }
}
