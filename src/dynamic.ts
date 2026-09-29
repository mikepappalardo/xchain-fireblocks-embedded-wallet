import {
  createDynamicClient,
  type DynamicClient,
  type WalletAccount,
} from "@dynamic-labs-sdk/client"
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  isWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas"
import { addEvmExtension, isEvmWalletAccount } from "@dynamic-labs-sdk/evm"
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem"
import type { SignTypedDataParams } from "algo-x-evm-sdk"
import { assertEcdsaSignature, toViemSignTypedData } from "./typed-data.js"
import { selectXChainWalletAccount, type XChainWalletSource } from "./select-account.js"

export interface XChainDynamicClientOptions {
  environmentId: string
  /** Shown in wallet prompts. */
  appName: string
  /** App origin used for deep links and sign-in messages. Allowlist this origin in the Dynamic dashboard. */
  universalLink?: string
  iconUrl?: string
}

/**
 * Create a Dynamic client with the EVM extension registered.
 *
 * Call this once at startup, before React renders. The same `environmentId`
 * across apps yields the same embedded key and therefore the same xChain address.
 */
export function createXChainDynamicClient(options: XChainDynamicClientOptions): DynamicClient {
  const metadata: { name: string; universalLink?: string; iconUrl?: string } = {
    name: options.appName,
  }
  if (options.universalLink) metadata.universalLink = options.universalLink
  if (options.iconUrl) metadata.iconUrl = options.iconUrl

  const client = createDynamicClient({
    environmentId: options.environmentId,
    metadata,
  })
  addEvmExtension()
  return client
}

/**
 * Create the embedded EVM wallet when the signed-in user does not have one yet.
 * Solana and other chains are left alone so their addresses are not confused
 * with the xChain account.
 */
export async function ensureEvmWaasWallet(): Promise<void> {
  const missing = getChainsMissingWaasWalletAccounts()
  const evm = missing.filter((chain) => chain === "EVM")
  if (evm.length === 0) return
  await createWaasWalletAccounts({ chains: evm })
}

export function findXChainWalletAccount(
  accounts: readonly WalletAccount[],
  options?: { source?: XChainWalletSource; evmAddress?: string },
): WalletAccount | undefined {
  return selectXChainWalletAccount(accounts, {
    isEvm: (account) => isEvmWalletAccount(account),
    isWaas: (account) => isWaasWalletAccount({ walletAccount: account }),
    ...(options?.source ? { source: options.source } : {}),
    ...(options?.evmAddress ? { evmAddress: options.evmAddress } : {}),
  })
}

/**
 * Sign an xChain EIP-712 payload with a Dynamic EVM wallet.
 * The domain is forwarded as `{ name, version }` only.
 */
export async function signXChainTypedData(
  walletAccount: WalletAccount,
  typedData: SignTypedDataParams,
): Promise<`0x${string}`> {
  if (!isEvmWalletAccount(walletAccount)) {
    throw new Error(
      "xChain accounts are owned by an EVM address. Pass the Dynamic EVM wallet, not a Solana-derived Algorand account.",
    )
  }

  const walletClient = await createWalletClientForWalletAccount({ walletAccount })
  if (!walletClient) {
    throw new Error("Dynamic did not return an EVM wallet client for this account.")
  }

  const signature = await walletClient.signTypedData(toViemSignTypedData(typedData))
  return assertEcdsaSignature(signature)
}
