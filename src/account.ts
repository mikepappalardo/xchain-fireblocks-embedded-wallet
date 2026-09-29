import type { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { AlgoXEvmSdk, type SignTypedDataParams } from "algo-x-evm-sdk"
import type algosdk from "algosdk"
import { normalizeEvmAddress } from "./address.js"

export interface XChainAccount {
  evmAddress: `0x${string}`
  algoAddress: string
  signer: algosdk.TransactionSigner
}

/**
 * Derive the xChain logic-signature account for an EVM address and return an
 * AlgoKit-compatible signer. `signTypedData` must sign the payload unchanged.
 */
export async function createXChainAccount(params: {
  algorand: AlgorandClient
  evmAddress: string
  signTypedData: (typedData: SignTypedDataParams) => Promise<string>
}): Promise<XChainAccount> {
  const evmAddress = normalizeEvmAddress(params.evmAddress)
  const sdk = new AlgoXEvmSdk({ algorand: params.algorand })
  const { addr, signer } = await sdk.getSigner({
    evmAddress,
    signMessage: params.signTypedData,
  })

  return {
    evmAddress,
    algoAddress: addr,
    signer,
  }
}
