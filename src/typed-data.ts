import type { SignTypedDataParams } from "algo-x-evm-sdk"

/**
 * EIP-712 payload forwarded to Dynamic / viem.
 *
 * The domain contains only `name` and `version`. xChain's on-chain check
 * hashes that exact domain. A `chainId` (or any other field) produces a
 * different digest and the logic signature rejects the signature.
 */
export interface XChainViemTypedData {
  domain: { name: "Algorand x EVM"; version: "1" }
  types: {
    "Algorand Transaction": SignTypedDataParams["types"]["Algorand Transaction"]
  }
  primaryType: "Algorand Transaction"
  message: SignTypedDataParams["message"]
}

export function toViemSignTypedData(typedData: SignTypedDataParams): XChainViemTypedData {
  return {
    domain: {
      name: typedData.domain.name,
      version: typedData.domain.version,
    },
    types: {
      "Algorand Transaction": typedData.types["Algorand Transaction"],
    },
    primaryType: typedData.primaryType,
    message: typedData.message,
  }
}

/** 65-byte ECDSA signature: 0x + 130 hex chars. */
export function assertEcdsaSignature(signature: string): `0x${string}` {
  if (!/^0x[\da-fA-F]{130}$/.test(signature)) {
    throw new Error("Dynamic returned an EIP-712 signature that is not 65 bytes.")
  }
  return signature as `0x${string}`
}
