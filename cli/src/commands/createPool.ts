import chalk from 'chalk'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import inquirer from 'inquirer'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'
import { validatePublicKey } from '../utils/helpers.js'

export async function createPoolCommand() {
    console.log(chalk.bold.cyan('\n🏊 Create New Token Pool\n'))

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

    // Load saved configs
    let savedConfigs: any[] = []
    try {
        const fs = await import('fs')
        const configsData = fs.readFileSync('./configs.json', 'utf-8')
        savedConfigs = JSON.parse(configsData)
    } catch {
        // No saved configs
    }

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'configSource',
            message: 'Select config source:',
            choices: [
                ...(savedConfigs.length > 0
                    ? [{ name: 'Use saved config', value: 'saved' }]
                    : []),
                { name: 'Enter config address manually', value: 'manual' },
            ],
        },
    ])

    let configAddress: string

    if (answers.configSource === 'saved' && savedConfigs.length > 0) {
        const configChoice = await inquirer.prompt([
            {
                type: 'list',
                name: 'config',
                message: 'Select a config:',
                choices: savedConfigs.map((c) => ({
                    name: `${c.address} (${new Date(
                        c.createdAt
                    ).toLocaleString()})`,
                    value: c.address,
                })),
            },
        ])
        configAddress = configChoice.config
    } else {
        const manualConfig = await inquirer.prompt([
            {
                type: 'input',
                name: 'configAddress',
                message: 'Enter config address:',
                validate: (input) =>
                    validatePublicKey(input) ? true : 'Invalid public key',
            },
        ])
        configAddress = manualConfig.configAddress
    }

    // Fetch config to get token type
    console.log(chalk.yellow('\n⏳ Fetching config data...\n'))
    const configData = await client.state.getPoolConfig(
        new PublicKey(configAddress)
    )

    const poolTypeAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'poolType',
            message: 'Pool type:',
            choices: [
                { name: 'Create new token', value: 'new' },
                { name: 'Use existing SPL token', value: 'existingSpl' },
                { name: 'Use existing Token2022', value: 'existingToken2022' },
            ],
        },
    ])

    let tokenAnswers: any

    if (poolTypeAnswer.poolType === 'new') {
        tokenAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Token name:',
                validate: (input) => (input.length > 0 ? true : 'Name is required'),
            },
            {
                type: 'input',
                name: 'symbol',
                message: 'Token symbol:',
                validate: (input) =>
                    input.length > 0 ? true : 'Symbol is required',
            },
            {
                type: 'input',
                name: 'uri',
                message: 'Token metadata URI:',
                default: 'https://example.com/metadata.json',
            },
            {
                type: 'confirm',
                name: 'firstBuy',
                message: 'Make a first buy after creating the pool?',
                default: false,
            },
        ])
    } else {
        tokenAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'existingMint',
                message: 'Existing token mint address:',
                validate: (input) =>
                    validatePublicKey(input) ? true : 'Invalid public key',
            },
            {
                type: 'input',
                name: 'name',
                message: 'Token name (for display):',
                validate: (input) => (input.length > 0 ? true : 'Name is required'),
            },
            {
                type: 'input',
                name: 'symbol',
                message: 'Token symbol (for display):',
                validate: (input) =>
                    input.length > 0 ? true : 'Symbol is required',
            },
            {
                type: 'confirm',
                name: 'firstBuy',
                message: 'Make a first buy after creating the pool?',
                default: false,
            },
        ])
    }

    let firstBuyAmount: string | undefined
    if (tokenAnswers.firstBuy) {
        const buyAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'amount',
                message: 'Amount to buy (in SOL):',
                default: '0.1',
                validate: (input) =>
                    !isNaN(Number(input)) && Number(input) > 0
                        ? true
                        : 'Please enter a valid amount',
            },
        ])
        firstBuyAmount = buyAnswers.amount
    }

    try {
        console.log(chalk.yellow('\n🏊 Creating pool...\n'))

        let createPoolTx
        let baseMintPublicKey: PublicKey
        let baseMintKeypair: Keypair | undefined

        if (poolTypeAnswer.poolType === 'new') {
            // Generate token mint keypair
            baseMintKeypair = Keypair.generate()
            baseMintPublicKey = baseMintKeypair.publicKey

            // Create pool with new token
            createPoolTx = await client.pool.createPool({
                baseMint: baseMintPublicKey,
                config: new PublicKey(configAddress),
                name: tokenAnswers.name,
                symbol: tokenAnswers.symbol,
                uri: tokenAnswers.uri,
                payer: wallet.publicKey,
                poolCreator: wallet.publicKey,
            })
        } else if (poolTypeAnswer.poolType === 'existingSpl') {
            // Use existing SPL token
            baseMintPublicKey = new PublicKey(tokenAnswers.existingMint)

            createPoolTx = await client.pool.createPoolWithExistingSplToken({
                payer: wallet.publicKey,
                config: new PublicKey(configAddress),
                poolCreator: wallet.publicKey,
                existingTokenMint: baseMintPublicKey,
            })
        } else {
            // Use existing Token2022
            baseMintPublicKey = new PublicKey(tokenAnswers.existingMint)

            createPoolTx = await client.pool.createPoolWithExistingToken2022({
                payer: wallet.publicKey,
                config: new PublicKey(configAddress),
                poolCreator: wallet.publicKey,
                existingTokenMint: baseMintPublicKey,
            })
        }

        createPoolTx.feePayer = wallet.publicKey
        createPoolTx.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash

        // Sign with baseMint keypair only if creating new token
        if (baseMintKeypair) {
            createPoolTx.sign(wallet, baseMintKeypair)
        } else {
            createPoolTx.sign(wallet)
        }

        const signature = await connection.sendRawTransaction(
            createPoolTx.serialize()
        )
        await connection.confirmTransaction(signature, 'confirmed')

        console.log(chalk.green('\n✅ Pool created successfully!\n'))

        // Derive pool address
        const programId = new PublicKey('FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H')
        const quoteMint = new PublicKey('So11111111111111111111111111111111111111112') // SOL
        const isQuoteMintBiggerThanBaseMint = quoteMint.toBuffer().compare(baseMintPublicKey.toBuffer()) > 0
        
        const [poolAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('pool'),
                new PublicKey(configAddress).toBuffer(),
                isQuoteMintBiggerThanBaseMint ? quoteMint.toBuffer() : baseMintPublicKey.toBuffer(),
                isQuoteMintBiggerThanBaseMint ? baseMintPublicKey.toBuffer() : quoteMint.toBuffer(),
            ],
            programId
        )

        console.log(chalk.cyan('📋 Pool Details:'))
        console.log(
            chalk.white(
                `   Pool Address: ${chalk.bold(poolAddress.toBase58())}`
            )
        )
        console.log(
            chalk.white(
                `   Token Mint: ${chalk.bold(baseMintPublicKey.toBase58())}`
            )
        )
        console.log(chalk.white(`   Config: ${chalk.bold(configAddress)}`))
        console.log(
            chalk.white(
                `   Pool Type: ${chalk.bold(
                    poolTypeAnswer.poolType === 'new' 
                        ? 'New Token' 
                        : poolTypeAnswer.poolType === 'existingSpl' 
                        ? 'Existing SPL Token' 
                        : 'Existing Token2022'
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

        // Save pool info
        const poolData = {
            address: poolAddress.toBase58(),
            tokenMint: baseMintPublicKey.toBase58(),
            config: configAddress,
            name: tokenAnswers.name,
            symbol: tokenAnswers.symbol,
            poolType: poolTypeAnswer.poolType,
            createdAt: new Date().toISOString(),
            txSignature: signature,
        }

        const fs = await import('fs')
        const poolsFile = './pools.json'
        let pools = []

        try {
            const existingData = fs.readFileSync(poolsFile, 'utf-8')
            pools = JSON.parse(existingData)
        } catch {
            // File doesn't exist yet
        }

        pools.push(poolData)
        fs.writeFileSync(poolsFile, JSON.stringify(pools, null, 2))

        console.log(chalk.gray(`\n💾 Pool saved to ${poolsFile}`))

        if (firstBuyAmount) {
            console.log(
                chalk.yellow(
                    '\n⚠️  First buy feature requires pool address from transaction. Please use the swap command after pool is created.\n'
                )
            )
        }
    } catch (error) {
        console.error(chalk.red('\n❌ Error creating pool:'), error)
        throw error
    }
}
