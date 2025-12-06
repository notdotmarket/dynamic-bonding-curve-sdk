import chalk from 'chalk'
import { DynamicBondingCurveClient } from '@notdotmarket/dynamic-bonding-curve-sdk'
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js'
import {
    TOKEN_PROGRAM_ID,
    createInitializeMint2Instruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    createMintToInstruction,
} from '@solana/spl-token'
import inquirer from 'inquirer'
import { getConnection, loadWalletFromEnv } from '../utils/wallet.js'
import { validatePublicKey } from '../utils/helpers.js'

export async function createTokenAndPoolCommand() {
    console.log(chalk.bold.cyan('\n🪙 Create Token & Pool (Separate Steps)\n'))

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

    const tokenAnswers = await inquirer.prompt([
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
            type: 'list',
            name: 'decimals',
            message: 'Token decimals:',
            choices: [
                { name: '6 decimals', value: 6 },
                { name: '9 decimals', value: 9 },
            ],
            default: 9,
        },
        {
            type: 'input',
            name: 'initialSupply',
            message: 'Initial supply to mint to your wallet:',
            default: '1000000000',
            validate: (input) =>
                !isNaN(Number(input)) && Number(input) >= 0
                    ? true
                    : 'Please enter a valid amount',
        },
    ])

    try {
        // STEP 1: Create Token
        console.log(chalk.yellow('\n🪙 Step 1: Creating token mint...\n'))

        const mintKeypair = Keypair.generate()
        const mintRent = await getMinimumBalanceForRentExemptMint(connection)

        const createAccountIx = SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID,
        })

        const initMintIx = createInitializeMint2Instruction(
            mintKeypair.publicKey,
            tokenAnswers.decimals,
            wallet.publicKey, // mint authority
            wallet.publicKey, // freeze authority
            TOKEN_PROGRAM_ID
        )

        // Create associated token account for wallet
        const walletTokenAccount = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID
        )

        const createAtaIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            walletTokenAccount,
            wallet.publicKey,
            mintKeypair.publicKey,
            TOKEN_PROGRAM_ID
        )

        // Mint initial supply to wallet
        const mintToIx = createMintToInstruction(
            mintKeypair.publicKey,
            walletTokenAccount,
            wallet.publicKey,
            BigInt(tokenAnswers.initialSupply) * BigInt(10 ** tokenAnswers.decimals),
            [],
            TOKEN_PROGRAM_ID
        )

        const createTokenTx = new Transaction().add(
            createAccountIx,
            initMintIx,
            createAtaIx,
            mintToIx
        )

        createTokenTx.feePayer = wallet.publicKey
        createTokenTx.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash

        createTokenTx.sign(wallet, mintKeypair)

        const tokenSignature = await connection.sendRawTransaction(
            createTokenTx.serialize()
        )
        await connection.confirmTransaction(tokenSignature, 'confirmed')

        console.log(chalk.green('✅ Token created successfully!\n'))
        console.log(
            chalk.white(
                `   Token Mint: ${chalk.bold(mintKeypair.publicKey.toBase58())}`
            )
        )
        console.log(
            chalk.white(
                `   Initial Supply: ${Number(tokenAnswers.initialSupply).toLocaleString()} tokens`
            )
        )
        console.log(
            chalk.white(
                `   Transaction: https://explorer.solana.com/tx/${tokenSignature}?cluster=${
                    process.env.NETWORK || 'devnet'
                }`
            )
        )

        // STEP 2: Create Pool with existing token
        console.log(chalk.yellow('\n🏊 Step 2: Creating pool with token...\n'))

        const createPoolTx = await client.pool.createPoolWithExistingSplToken({
            payer: wallet.publicKey,
            config: new PublicKey(configAddress),
            poolCreator: wallet.publicKey,
            existingTokenMint: mintKeypair.publicKey,
        })

        createPoolTx.feePayer = wallet.publicKey
        createPoolTx.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash

        createPoolTx.sign(wallet)

        const poolSignature = await connection.sendRawTransaction(
            createPoolTx.serialize()
        )
        await connection.confirmTransaction(poolSignature, 'confirmed')

        console.log(chalk.green('✅ Pool created successfully!\n'))

        // Derive pool address
        const programId = new PublicKey('FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H')
        const quoteMint = new PublicKey('So11111111111111111111111111111111111111112') // SOL
        const isQuoteMintBiggerThanBaseMint =
            quoteMint.toBuffer().compare(mintKeypair.publicKey.toBuffer()) > 0

        const [poolAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('pool'),
                new PublicKey(configAddress).toBuffer(),
                isQuoteMintBiggerThanBaseMint
                    ? quoteMint.toBuffer()
                    : mintKeypair.publicKey.toBuffer(),
                isQuoteMintBiggerThanBaseMint
                    ? mintKeypair.publicKey.toBuffer()
                    : quoteMint.toBuffer(),
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
                `   Token Mint: ${chalk.bold(mintKeypair.publicKey.toBase58())}`
            )
        )
        console.log(chalk.white(`   Config: ${chalk.bold(configAddress)}`))
        console.log(
            chalk.white(
                `   Transaction: https://explorer.solana.com/tx/${poolSignature}?cluster=${
                    process.env.NETWORK || 'devnet'
                }`
            )
        )

        // Save pool info
        const poolData = {
            address: poolAddress.toBase58(),
            tokenMint: mintKeypair.publicKey.toBase58(),
            config: configAddress,
            name: tokenAnswers.name,
            symbol: tokenAnswers.symbol,
            poolType: 'separate',
            createdAt: new Date().toISOString(),
            tokenTxSignature: tokenSignature,
            poolTxSignature: poolSignature,
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
        console.log(
            chalk.green(
                '\n🎉 Token and pool created successfully in separate steps!\n'
            )
        )
    } catch (error) {
        console.error(chalk.red('\n❌ Error:'), error)
        throw error
    }
}
