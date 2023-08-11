const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const secp256k1 = require('secp256k1');
const keccak = require('keccak');
const crypto = require('crypto');


const defaultValues = {
  startPattern: '', // Prefix
  endPattern: '', // Suffix
  isChecksum: false, 
  step: 50_000,
  maxTries: 5_000_000_000_000_000,
  logOutputIntervall: 10_000
};

const args = require('minimist')(process.argv.slice(2), {
  alias: {
    s: 'startPattern',
    e: 'endPattern',
    c: 'isChecksum',
    p: 'step',
    m: 'maxTries',
    i: 'logOutputIntervall'
  }
});

const startPattern = String(args.startPattern) || defaultValues.startPattern;
const endPattern = String(args.endPattern) || defaultValues.endPattern;
const isChecksum = args.isChecksum !== undefined ? args.isChecksum === 'true' : defaultValues.isChecksum;
const step = args.step || defaultValues.step;
const maxTries = args.maxTries || defaultValues.maxTries;
const logOutputIntervall = args.logOutputIntervall || defaultValues.logOutputIntervall;

let interval;

const commonExitHandler = () => {
  console.log('\nCaught interrupt signal, killing workers ...');
  for (const id in cluster.workers) {
    cluster.workers[id].process.kill();
  }
  process.exit();
};

process.on('SIGINT', commonExitHandler);

const privateToAddress = (privateKey) => {
  const pub = secp256k1.publicKeyCreate(privateKey, false).slice(1);
  return keccak('keccak256').update(Buffer.from(pub)).digest().slice(-20).toString('hex');
};

const getRandomWallet = () => {
  const randbytes = crypto.randomBytes(32);
  return {
    address: privateToAddress(randbytes),
    privKey: randbytes.toString('hex'),
  };
};

const checkChar = (char, i, hash) => parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char;

const isValidVanityAddress = (address, prefix, suffix, isChecksum) => {
  const addressPrefix = address.substring(0, prefix.length);
  const addressSuffix = address.substring(40 - suffix.length);
  const hash = isChecksum ? keccak('keccak256').update(address).digest('hex') : null; 

  if (!isChecksum) {
    return prefix.toLowerCase() === addressPrefix.toLowerCase() && suffix.toLowerCase() === addressSuffix.toLowerCase();
  }
  if (prefix !== addressPrefix || suffix !== addressSuffix) {
    return false;
  }

  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== checkChar(address[i], i, hash)) return false; 
  }

  for (let i = 0; i < suffix.length; i++) {
    const j = i + 40 - suffix.length;
    if (suffix[i] !== checkChar(address[j], j, hash)) return false;
  }

  return true;
};

const toChecksumAddress = (address) => {
  const hash = keccak('keccak256').update(address).digest();
  let ret = '';

  for (let i = 0; i < address.length; i++) {
    const char = parseInt(hash[i], 16) >= 8 ? address[i].toUpperCase() : address[i];
    ret += char;
  }

  return ret;
};

const getVanityWallet = async (prefix, suffix, isChecksum, cb) => {
  const pre = prefix.toLowerCase();
  const suf = suffix.toLowerCase();

  for (let attempts = 1; attempts <= maxTries; attempts++) {
    const wallet = getRandomWallet();

    if (isValidVanityAddress(wallet.address, pre, suf, isChecksum)) {
      cb({ address: '0x' + toChecksumAddress(wallet.address), privKey: wallet.privKey, attempts });
      return;
    }

    if (attempts % step === 0) {
      cb({ attempts: step });
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  cb({ maxAttemptsReached: true });
};

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  let totalAttempts = 0;

  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }

  // Print the total number of checked addresses every 10 seconds
  interval = setInterval(() => {
    console.log(`Total checked addresses: ${totalAttempts.toLocaleString()}`);
  }, logOutputIntervall);

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });

  cluster.on('message', (worker, message) => {
    if (message.address) {
      console.log('Address:', message.address);
      console.log('Private Key:', message.privKey);

      // Write the address and private key to a file
      fs.writeFileSync('vanity-address.txt', `Address: ${message.address}\nPrivate Key: ${message.privKey}`);

      console.log('Address and private key saved to vanity-address.txt');

      // Kill all workers once a match is found
      for (const id in cluster.workers) {
        cluster.workers[id].process.kill();
      }
      clearInterval(interval);
      process.exit();
    } else if (message.attempts) {
      totalAttempts += message.attempts;
      if (totalAttempts >= maxTries) {
        console.log(`Reached ${maxTries} attempts, killing workers ...`);
        for (const id in cluster.workers) {
          cluster.workers[id].process.kill();
        }
        clearInterval(interval);
        process.exit();
      }
    }
  });
} else {
  console.log(`Worker ${process.pid} started`);

  getVanityWallet(startPattern, endPattern, isChecksum, (message) => {
    if (message.address) {
      process.send({ address: message.address, privKey: message.privKey });
    } else if (message.attempts) {
      process.send({ attempts: message.attempts });
    }
  });
}
