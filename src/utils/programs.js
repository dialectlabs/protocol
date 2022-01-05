const dns = require('dns');
const os = require('os');

async function getLocalIpAddress() {
  return new Promise((resolve, reject) => {dns.lookup(os.hostname(), function (error, address, fam) {
    if (address) {
      resolve(address);
    } else if (error) {
      reject(error);
    }
  })});
} 

localhostIpAddress = "localhost"

try {
  localhostIpAddress = await getLocalIpAddress();
} catch (error) {
  console.error("Error fetching machine address");
}

export default {
  "localnet": {
    "clusterAddress": `http://${localhostIpAddress}:8899`,
    "programAddress": "AZ3f7JXAZbta2artWRuYLsWZHm5mzvaVtoiFBz1rq5yv"
  },
  "localnet-kir-uetliberg": {
    "clusterAddress": "http://192.168.1.129:8899",
    "programAddress": "AZ3f7JXAZbta2artWRuYLsWZHm5mzvaVtoiFBz1rq5yv"
  },
  "devnet": {
    "clusterAddress": "https://api.devnet.solana.com",
    "programAddress": "3M3nKvLbacY6JT3Ru1gQq3wJ8VKenKVRxnjx1S5QM3YR"
  },
  "testnet": {
    "clusterAddress": "",
    "programAddress": ""
  },
  "mainnet-beta": {
    "clusterAddress": "",
    "programAddress": ""
  }
}
