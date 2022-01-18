// TODO:'
const fs = require('fs');
const toml = require('toml-js');
const BASE_DIR = require('./_base-dir');

const configs = {
  anchor: `${BASE_DIR}/Anchor.toml`,
  // lib: ,
  // programs ,
};

function setTomlAddress(address) {
  const anchorTomlString = fs.readFileSync(configs.anchor, 'utf-8');
  const anchorToml = toml.parse(anchorTomlString);
  anchorToml.programs.localnet.dialect = address;
  const nextTomlString = toml.dump(anchorToml);
  fs.writeFileSync(configs.anchor, nextTomlString);
}

function setProgramAddress(address) {
  setTomlAddress(address);
}

// setProgramAddress('kek');
setProgramAddress('2YFyZAg8rBtuvzFFiGvXwPHFAQJ2FXZoS7bYCKticpjk');
