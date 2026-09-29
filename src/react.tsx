import type { AlgorandClient } from "@algorandfoundation/algokit-utils"
import type { WalletAccount } from "@dynamic-labs-sdk/client"
import { useGetWalletAccounts, useOnEvent, useUser } from "@dynamic-labs-sdk/react-hooks"
import type { SignTypedDataParams } from "algo-x-evm-sdk"
import type algosdk from "algosdk"
import { useEffect, useRef, useState } from "react"
import { createXChainAccount } from "./account.js"
import { ensureEvmWaasWallet, findXChainWalletAccount, signXChainTypedData } from "./dynamic.js"
import type { XChainWalletSource } from "./select-account.js"

export type XChainAccountStatus = "loading" | "signed-out" | "missing-wallet" | "ready" | "error"

export interface UseXChainAccountOptions {
  algorand: AlgorandClient
  /** Defaults to the embedded EVM wallet. `any-evm` falls back to another connected EVM account. */
  source?: XChainWalletSource
  /** When set, only this EVM address is used. */
  evmAddress?: string
}

export interface UseXChainAccountResult {
  status: XChainAccountStatus
  evmAddress: `0x${string}` | null
  algoAddress: string | null
  walletAccount: WalletAccount | null
  signer: algosdk.TransactionSigner | null
  error: Error | null
  signTypedData: ((typedData: SignTypedDataParams) => Promise<`0x${string}`>) | null
}

interface DerivedAccount {
  evmAddress: `0x${string}`
  algoAddress: string
  signer: algosdk.TransactionSigner
}

/**
 * Read the Dynamic EVM wallet and expose the matching xChain account.
 * Must render under `DynamicProvider`. Mount `XChainWaasBootstrap` once so the
 * embedded wallet exists after login.
 */
export function useXChainAccount(options: UseXChainAccountOptions): UseXChainAccountResult {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: walletAccounts = [], isLoading: walletsLoading } = useGetWalletAccounts()
  const walletAccount =
    findXChainWalletAccount(walletAccounts, {
      ...(options.source ? { source: options.source } : {}),
      ...(options.evmAddress ? { evmAddress: options.evmAddress } : {}),
    }) ?? null

  const accountRef = useRef<WalletAccount | null>(walletAccount)
  accountRef.current = walletAccount

  const [derived, setDerived] = useState<DerivedAccount | null>(null)
  const [deriving, setDeriving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const lookupAddress = walletAccount?.address ?? null

  useEffect(() => {
    if (!lookupAddress) {
      setDerived(null)
      setDeriving(false)
      setError(null)
      return
    }

    let cancelled = false
    setDerived(null)
    setDeriving(true)
    setError(null)

    createXChainAccount({
      algorand: options.algorand,
      evmAddress: lookupAddress,
      signTypedData: (typedData) => {
        const account = accountRef.current
        if (!account) return Promise.reject(new Error("Dynamic EVM wallet is not connected."))
        return signXChainTypedData(account, typedData)
      },
    }).then(
      (account) => {
        if (cancelled) return
        setDerived(account)
        setDeriving(false)
      },
      (cause: unknown) => {
        if (cancelled) return
        setDerived(null)
        setDeriving(false)
        setError(cause instanceof Error ? cause : new Error(String(cause)))
      },
    )

    return () => {
      cancelled = true
    }
  }, [options.algorand, lookupAddress])

  const signTypedData =
    walletAccount === null
      ? null
      : (typedData: SignTypedDataParams) => signXChainTypedData(walletAccount, typedData)

  if (userLoading || walletsLoading || deriving) {
    return {
      status: "loading",
      evmAddress: derived?.evmAddress ?? null,
      algoAddress: derived?.algoAddress ?? null,
      walletAccount,
      signer: null,
      error: null,
      signTypedData,
    }
  }

  if (error) {
    return {
      status: "error",
      evmAddress: null,
      algoAddress: null,
      walletAccount,
      signer: null,
      error,
      signTypedData,
    }
  }

  if (!user) {
    return {
      status: "signed-out",
      evmAddress: null,
      algoAddress: null,
      walletAccount: null,
      signer: null,
      error: null,
      signTypedData: null,
    }
  }

  if (!derived || !walletAccount) {
    return {
      status: "missing-wallet",
      evmAddress: null,
      algoAddress: null,
      walletAccount: null,
      signer: null,
      error: null,
      signTypedData: null,
    }
  }

  return {
    status: "ready",
    evmAddress: derived.evmAddress,
    algoAddress: derived.algoAddress,
    walletAccount,
    signer: derived.signer,
    error: null,
    signTypedData,
  }
}

/**
 * After login, create the embedded EVM wallet if Dynamic has not created one yet.
 * Mount once inside `DynamicProvider`.
 */
export function XChainWaasBootstrap() {
  useOnEvent({
    event: "userChanged",
    listener: async ({ user }) => {
      if (!user) return
      await ensureEvmWaasWallet()
    },
  })
  return null
}
