#!/usr/bin/env bun

// Helper script to convert keypair array to base58
import bs58 from 'bs58'

const secretKeyArray = [64,243,53,35,18,61,36,135,14,126,217,20,2,116,90,80,13,175,153,242,23,216,251,134,241,28,59,174,163,154,110,231,192,180,11,66,165,162,68,229,218,193,250,26,169,99,239,200,1,70,22,158,33,242,229,21,123,150,80,131,247,19,150,249]

const secretKey = new Uint8Array(secretKeyArray)
const base58Key = bs58.encode(secretKey)

console.log('\n🔑 Your Base58 Private Key:\n')
console.log(base58Key)
console.log('\n📝 Copy this to your .env file as PRIVATE_KEY=\n')
