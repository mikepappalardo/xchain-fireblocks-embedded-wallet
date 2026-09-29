import { sameEvmAddress } from "./address.js"

/**
 * `waas` uses only the Dynamic embedded wallet.
 * `any-evm` prefers that embedded wallet, then any other connected EVM account.
 */
export type XChainWalletSource = "waas" | "any-evm"

export function selectXChainWalletAccount<T extends { address: string }>(
  accounts: readonly T[],
  options: {
    isEvm: (account: T) => boolean
    isWaas: (account: T) => boolean
    source?: XChainWalletSource
    evmAddress?: string
  },
): T | undefined {
  const source = options.source ?? "waas"
  const evmAccounts = accounts.filter((account) => {
    if (!options.isEvm(account)) return false
    if (options.evmAddress && !sameEvmAddress(account.address, options.evmAddress)) return false
    return true
  })

  const embedded = evmAccounts.find((account) => options.isWaas(account))
  if (source === "waas") return embedded
  return embedded ?? evmAccounts[0]
}
