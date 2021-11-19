# dialect

## local development

### building for local usage

"local usage" means installation of this package through "file://..." 
```
> npm install
> npm run build
> npm run local-publish
```
During local-publish step we remove the node_modules from this folder so that, when installed, they are not being consumed during main app's run


### install solana, anchor

notes coming soon

### run localnoet

```
solana-test-validator --rpc-port 8899
```

### deploy

make sure you have SOL via an airdrop

```
solana airdrop 10
```

from the root `protocol/` directory, run

```
anchor deploy
```

this will give you a program id as output, which you should then put in program.json
