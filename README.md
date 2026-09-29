# xchain-dynamic

Connect a [Dynamic](https://www.dynamic.xyz) embedded EVM wallet to an [Algorand xChain](https://github.com/algorandfoundation/xchain-accounts) account, and reuse that connection in every app.

The embedded wallet's EVM address owns a logic-signature account. Signing an Algorand transaction asks that wallet for one EIP-712 signature. [algo-x-evm-sdk](https://www.npmjs.com/package/algo-x-evm-sdk) checks the signature on-chain. The same EVM key always maps to the same Algorand address.

Dynamic's Solana-derived Algorand account is a different address. This library uses the EVM wallet only.

## Install

```bash
npm install github:mikepappalardo/xchain-dynamic
npm install algo-x-evm-sdk @algorandfoundation/algokit-utils algosdk
npm install @dynamic-labs-sdk/client @dynamic-labs-sdk/evm @dynamic-labs-sdk/react-hooks @tanstack/react-query react
```

`@dynamic-labs-sdk/*` and `react` are optional peers. Install them for the `xchain-dynamic/dynamic` and `xchain-dynamic/react` entry points. The root entry only needs `algo-x-evm-sdk`.

## Same account across apps

Dynamic scopes an embedded key to an environment. Use one environment id in every app, and allowlist each app origin in that environment. A new environment id creates a new EVM key and a new xChain address.

Leave private-key export enabled in the Dynamic dashboard if users should be able to move the account to another EVM wallet later.

## React

Create the client once, before render. `createXChainDynamicClient` registers Dynamic's EVM extension.

```ts
import { createXChainDynamicClient } from "xchain-dynamic/dynamic"

export const dynamicClient = createXChainDynamicClient({
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: "My App",
  universalLink: window.location.origin,
})
```

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { XChainWaasBootstrap, useXChainAccount } from "xchain-dynamic/react"
import { dynamicClient } from "./dynamicClient"

const queryClient = new QueryClient()
// Keep this reference stable. A new client on every render re-derives the account.
const algorand = AlgorandClient.testNet()

function Account() {
  const account = useXChainAccount({ algorand })

  if (account.status === "signed-out") return <p>Sign in to create your xChain account.</p>
  if (account.status === "missing-wallet") return <p>Preparing your embedded wallet…</p>
  if (account.status !== "ready") return <p>Loading…</p>

  return (
    <div>
      <p>EVM: {account.evmAddress}</p>
      <p>Algorand: {account.algoAddress}</p>
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <XChainWaasBootstrap />
        <Account />
      </DynamicProvider>
    </QueryClientProvider>
  )
}
```

`XChainWaasBootstrap` creates the embedded EVM wallet after login. Dynamic does not create it automatically. Pass `account.signer` to AlgoKit as the transaction signer, and `account.algoAddress` as the sender. The account needs a minimum Algorand balance before it can send.

`useXChainAccount` defaults to the embedded wallet. Pass `source: "any-evm"` to fall back to another connected EVM account, or `evmAddress` to pin one.

Login UI is yours. The JavaScript SDK is headless. See Dynamic's [React quickstart](https://www.dynamic.xyz/docs/javascript/reference/react-quickstart) for email OTP.

## Without React

```ts
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { getWalletAccounts } from "@dynamic-labs-sdk/client"
import { createXChainAccount } from "xchain-dynamic"
import { findXChainWalletAccount, signXChainTypedData } from "xchain-dynamic/dynamic"

const walletAccount = findXChainWalletAccount(getWalletAccounts())
if (!walletAccount) throw new Error("No embedded EVM wallet")

const { algoAddress, signer } = await createXChainAccount({
  algorand: AlgorandClient.testNet(),
  evmAddress: walletAccount.address,
  signTypedData: (typedData) => signXChainTypedData(walletAccount, typedData),
})
```

`signXChainTypedData` sends `{ name: "Algorand x EVM", version: "1" }` and does not add `chainId`. That matches the logic signature. Adding a chain id makes the signature fail on-chain.

## Scripts

```bash
npm test
npm run typecheck
npm run build
```
