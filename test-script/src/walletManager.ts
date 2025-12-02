import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";

let keypair: Keypair | null = null;

/**
 * Initializes the wallet from the SOLANA_PRIVATE_KEY environment variable
 * The private key should be a JSON array of numbers (e.g., [1,2,3,...])
 */
export function initializeWallet(): Keypair {
  if (keypair) {
    return keypair;
  }

  const privateKeyEnv = process.env.SOLANA_PRIVATE_KEY;

  if (!privateKeyEnv) {
    throw new Error("SOLANA_PRIVATE_KEY environment variable is not set");
  }

  try {
    // Parse the private key array from the environment variable
    const privateKeyArray = JSON.parse(privateKeyEnv);

    if (!Array.isArray(privateKeyArray)) {
      throw new Error("SOLANA_PRIVATE_KEY must be a JSON array");
    }

    // Create Uint8Array from the array
    const secretKey = Uint8Array.from(privateKeyArray);

    // Create and store the keypair
    keypair = Keypair.fromSecretKey(secretKey);

    return keypair;
  } catch (error) {
    throw new Error(
      `Failed to initialize wallet from SOLANA_PRIVATE_KEY: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gets the initialized keypair
 * Throws an error if the wallet hasn't been initialized yet
 */
export function getKeypair(): Keypair {
  if (!keypair) {
    throw new Error("Wallet not initialized. Call initializeWallet() first");
  }
  return keypair;
}

/**
 * Gets the public key of the wallet
 */
export function getPublicKey() {
  return getKeypair().publicKey;
}

/**
 * Signs a transaction with the wallet's private key
 */
export function signTransaction(transaction: Transaction): Transaction {
  const kp = getKeypair();
  transaction.sign(kp);
  return transaction;
}

/**
 * Partially signs a transaction (for multi-signature scenarios)
 */
export function partialSignTransaction(transaction: Transaction): Transaction {
  const kp = getKeypair();
  transaction.partialSign(kp);
  return transaction;
}

/**
 * Signs a versioned transaction
 */
export function signVersionedTransaction(
  transaction: VersionedTransaction
): VersionedTransaction {
  const kp = getKeypair();
  transaction.sign([kp]);
  return transaction;
}

/**
 * Returns the secret key (use with caution!)
 */
export function getSecretKey(): Uint8Array {
  return getKeypair().secretKey;
}
