'use strict';

const fs = require('fs');
const { resolve } = require('path');
const path = require('path');

function getNetworkInterfaces() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = Object.create(null); // Or just '{}', an empty object

  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
              if (!results[name]) {
                  results[name] = [];
              }
              results[name].push(net.address);
          }
      }
  }
  return results;
}

async function replaceLocalnetClusterAddress() {
  const baseDir = path.resolve(__dirname, "..");
  const programsPath = `${baseDir}/src/utils/programs.json`;
  const programs = require(programsPath);
  let currentHostname = 'localhost';
  try {
    currentHostname = getNetworkInterfaces()["en0"][0] || currentHostname;
  } catch (error) {
    console.error("Error getting real machine ipadress");
  }
  const localClusterAddress = `http://${currentHostname}:8899`;
  let nextPrograms = Object.assign({}, programs);
  nextPrograms.localnet.clusterAddress = localClusterAddress;
  const data = JSON.stringify(nextPrograms, null, 2);
  fs.writeFileSync(programsPath, data);
  console.log(`Your machine address is ${currentHostname}.\nlocalnet.clusterAddress was set to ${localClusterAddress} in ./src/utils/programs.json. \nRebuild protocol to make it work in mobile repo.`)
}

replaceLocalnetClusterAddress();