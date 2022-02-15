
# 1. You are using Solana Wallet Adapter library

You need to update the wallet adapters with one of the following commands:
```
npm install @solana/wallet-adapter-wallets@latest
```
or
```
yarn add @solana/wallet-adapter-wallets@latest
```

##  a) You activated only the Solflare Extension adapter

You just need to update the wallet adapters and you're ready.

## b) You activated both Solflare Extension and Solflare Web

After you updated the wallet adapters you can remove the Solflare Web adapter.

## c) You activated only the Solflare Web adapter or don't use Solflare at all

Remove the web adapter (if used) and update the wallet adapters.

Follow this to add the new Solflare adapter: https://github.com/solana-labs/wallet-adapter

In most cases you just need to import `SolflareWalletAdapter` and add this to the list of adapters:
```
new SolflareWalletAdapter({ network })
```

# 2. You are not using the Solana Wallet Adapter library

Install the Solflare SDK with one of the following commands:
```
npm install @solflare-wallet/sdk
```
or
```
yarn add @solflare-wallet/sdk
```

## a) You have SOL Wallet Adapter implemented for Solflare Web or Sollet

You can use the same implementation with some small changes:

Replace
`import Wallet from '@project-serum/sol-wallet-adapter';`
with
`import Solflare from '@solflare-wallet/sdk';`

Replace
`const wallet = new Wallet(providerUrl);`
with
`const wallet = new Solflare({ network: 'mainnet-beta' });`

You can also use `devnet` or `testnet` for the network.

You can see the JavaScript interface on https://www.npmjs.com/package/@solflare-wallet/sdk

You can also see an example implementation on Mango: https://github.com/blockworks-foundation/mango-ui-v3/pull/146

## b) You have an adapter for Phantom wallet

You can use the same implementation with some small changes:

Import the SDK:
`import Solflare from '@solflare-wallet/sdk';`

Create a new instance of Solflare:
`const solflare = new Solflare({ network: 'mainnet-beta' });`

Instead of `window.solana` use the new `solflare` object.

For example instead of
`await window.solana.connect()`
use
`await solflare.connect()`

## c) You don't have either SOL Wallet Adapter or Phantom

To implement the Solflare SDK check the example code on https://www.npmjs.com/package/@solflare-wallet/sdk
