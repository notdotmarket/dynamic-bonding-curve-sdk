import { PublicKey } from '@solana/web3.js';

const programId = new PublicKey('FP72VdSGjvExv1cnz9TYeJZ1DXDeX9pBFEo574VaST8H');
const configAddr = new PublicKey('3VGa5qye1bKxyhBUhmY9FiNN63Dsv1vFj3P9c7GgKdFa');
const baseMint = new PublicKey('F7kb3GQqMgbcayS17QM7NyBCu3JBpRgHLaDykUf3ANfr');

console.log(`Expected by program: GGZ9ThN1c29d1AKmbyUkksnxV8SNmzBK6YGsfgRmX2b5`);

// Try: virtual_pool, config, base
const [pool1] = PublicKey.findProgramAddressSync([
  Buffer.from('virtual_pool'),
  configAddr.toBuffer(),
  baseMint.toBuffer()
], programId);
console.log(`['virtual_pool', config, base]: ${pool1.toString()} ${pool1.toString() === 'GGZ9ThN1c29d1AKmbyUkksnxV8SNmzBK6YGsfgRmX2b5' ? '✅ MATCH!' : ''}`);

// Try: virtual_pool, base, config  
const [pool2] = PublicKey.findProgramAddressSync([
  Buffer.from('virtual_pool'),
  baseMint.toBuffer(),
  configAddr.toBuffer()
], programId);
console.log(`['virtual_pool', base, config]: ${pool2.toString()} ${pool2.toString() === 'GGZ9ThN1c29d1AKmbyUkksnxV8SNmzBK6YGsfgRmX2b5' ? '✅ MATCH!' : ''}`);
