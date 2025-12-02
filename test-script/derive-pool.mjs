import { PublicKey } from '@solana/web3.js';

const programId = new PublicKey('FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H');
const configAddr = new PublicKey('3VGa5qye1bKxyhBUhmY9FiNN63Dsv1vFj3P9c7GgKdFa');
const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL
const baseMint = new PublicKey('F7kb3GQqMgbcayS17QM7NyBCu3JBpRgHLaDykUf3ANfr');

const isQuoteGreater = quoteMint.toBuffer().compare(baseMint.toBuffer()) > 0;
console.log(`Quote > Base: ${isQuoteGreater}`);

// SDK ordering
const [pool1] = PublicKey.findProgramAddressSync([
  Buffer.from('pool'),
  configAddr.toBuffer(),
  isQuoteGreater ? quoteMint.toBuffer() : baseMint.toBuffer(),
  isQuoteGreater ? baseMint.toBuffer() : quoteMint.toBuffer()
], programId);

console.log(`SDK derives: ${pool1.toString()}`);
console.log(`Expected by program: GGZ9ThN1c29d1AKmbyUkksnxV8SNmzBK6YGsfgRmX2b5`);

// Try config, base only
const [pool2] = PublicKey.findProgramAddressSync([
  Buffer.from('pool'),
  configAddr.toBuffer(),
  baseMint.toBuffer()
], programId);

console.log(`Alt (config, base): ${pool2.toString()}`);
