import type { SignTypedDataParams } from "algo-x-evm-sdk"
import { describe, expect, it } from "vitest"
import { assertEcdsaSignature, toViemSignTypedData } from "../src/typed-data.js"

function typedData(): SignTypedDataParams {
  return {
    domain: { name: "Algorand x EVM", version: "1" },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      "Algorand Transaction": [{ name: "Transaction ID", type: "bytes32" }],
    },
    primaryType: "Algorand Transaction",
    message: { "Transaction ID": `0x${"ab".repeat(32)}` },
  }
}

describe("toViemSignTypedData", () => {
  it("forwards the xChain domain without a chain id", () => {
    const payload = toViemSignTypedData(typedData())

    expect(payload.domain).toEqual({ name: "Algorand x EVM", version: "1" })
    expect(payload.primaryType).toBe("Algorand Transaction")
    expect(Object.keys(payload.types)).toEqual(["Algorand Transaction"])
    expect(JSON.stringify(payload)).not.toContain("chainId")
  })

  it("drops a chain id if one was attached to the domain", () => {
    const withChain = typedData() as SignTypedDataParams & {
      domain: SignTypedDataParams["domain"] & { chainId: number }
    }
    withChain.domain = { ...withChain.domain, chainId: 4160 }

    const payload = toViemSignTypedData(withChain)
    expect(payload.domain).toEqual({ name: "Algorand x EVM", version: "1" })
    expect("chainId" in payload.domain).toBe(false)
  })
})

describe("assertEcdsaSignature", () => {
  it("accepts a 65-byte hex signature", () => {
    const signature = `0x${"ab".repeat(65)}`
    expect(assertEcdsaSignature(signature)).toBe(signature)
  })

  it("rejects a truncated signature", () => {
    expect(() => assertEcdsaSignature(`0x${"ab".repeat(64)}`)).toThrow(/65 bytes/)
  })
})
