import { Connection, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import chalk from 'chalk'

export function loadWalletFromEnv(): Keypair {
    const privateKey = process.env.PRIVATE_KEY

    if (!privateKey) {
        console.error(
            chalk.red('❌ PRIVATE_KEY not found in environment variables')
        )
        console.log(
            chalk.yellow(
                '\nPlease set your PRIVATE_KEY in the .env file (base58 encoded)'
            )
        )
        process.exit(1)
    }

    try {
        const secretKey = bs58.decode(privateKey)
        return Keypair.fromSecretKey(secretKey)
    } catch (error) {
        console.error(chalk.red('❌ Invalid private key format'))
        console.log(
            chalk.yellow(
                'Please ensure your PRIVATE_KEY is base58 encoded in the .env file'
            )
        )
        process.exit(1)
    }
}

export function getConnection(): Connection {
    const rpcUrl =
        process.env.RPC_URL || 'https://api.devnet.solana.com'

    return new Connection(rpcUrl, 'confirmed')
}

export function displayWalletInfo(wallet: Keypair) {
    console.log(chalk.cyan('\n💼 Wallet Information:'))
    console.log(chalk.white(`   Address: ${wallet.publicKey.toBase58()}`))
}
