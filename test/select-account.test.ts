import { describe, expect, it } from "vitest"
import { selectXChainWalletAccount } from "../src/select-account.js"

interface Account {
  address: string
  kind: "waas-evm" | "external-evm" | "solana"
}

const accounts: Account[] = [
  { address: "So11111111111111111111111111111111111111112", kind: "solana" },
  { address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", kind: "external-evm" },
  { address: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", kind: "waas-evm" },
]

const isEvm = (account: Account) => account.kind !== "solana"
const isWaas = (account: Account) => account.kind === "waas-evm"

describe("selectXChainWalletAccount", () => {
  it("uses the embedded EVM wallet when an external EVM wallet is also connected", () => {
    const selected = selectXChainWalletAccount(accounts, { isEvm, isWaas })
    expect(selected?.kind).toBe("waas-evm")
  })

  it("returns nothing when the embedded wallet is missing and source is waas", () => {
    const externalOnly = accounts.filter((account) => account.kind !== "waas-evm")
    expect(selectXChainWalletAccount(externalOnly, { isEvm, isWaas, source: "waas" })).toBeUndefined()
  })

  it("falls back to another EVM account when source is any-evm", () => {
    const externalOnly = accounts.filter((account) => account.kind !== "waas-evm")
    const selected = selectXChainWalletAccount(externalOnly, { isEvm, isWaas, source: "any-evm" })
    expect(selected?.kind).toBe("external-evm")
  })

  it("pins a specific EVM address", () => {
    const selected = selectXChainWalletAccount(accounts, {
      isEvm,
      isWaas,
      source: "any-evm",
      evmAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    })
    expect(selected?.kind).toBe("external-evm")
  })
})
