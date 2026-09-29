export function normalizeEvmAddress(address: string): `0x${string}` {
  const hex = address.replace(/^0x/i, "")
  if (!/^[\da-fA-F]{40}$/.test(hex)) {
    throw new Error(`Expected a 20-byte EVM address, received "${address}".`)
  }
  return `0x${hex.toLowerCase()}`
}

export function sameEvmAddress(left: string, right: string): boolean {
  return left.replace(/^0x/i, "").toLowerCase() === right.replace(/^0x/i, "").toLowerCase()
}
