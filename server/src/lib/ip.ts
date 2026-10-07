import ipaddr from 'ipaddr.js'

/**
 * Rate-limit / throttle / audit bucket for a client address (M3).
 * - IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is normalised to plain IPv4.
 * - IPv6 is grouped by /64: a single customer usually gets a whole /64 (or more), so per-address keys
 *   would let one attacker rotate through 2^64 "clients".
 * Unparseable input is returned unchanged (it is only ever used as an opaque key).
 */
export function ipBucket(ip: string): string {
  if (!ipaddr.isValid(ip)) return ip
  const addr = ipaddr.process(ip)
  if (addr.kind() === 'ipv4') return addr.toString()
  const parts = (addr as ipaddr.IPv6).parts.slice(0, 4).map((p) => p.toString(16))
  return `${parts.join(':')}::/64`
}

type Range = [ipaddr.IPv4 | ipaddr.IPv6, number]

/** Compiles a TRUST_PROXY list (IPs and CIDRs) into a matcher. Invalid entries are ignored. */
export function compileTrustList(entries: readonly string[]): (ip: string) => boolean {
  const ranges: readonly Range[] = entries.flatMap((entry): Range[] => {
    if (ipaddr.isValidCIDR(entry)) return [ipaddr.parseCIDR(entry)]
    if (!ipaddr.isValid(entry)) return []
    const addr = ipaddr.process(entry)
    return [[addr, addr.kind() === 'ipv4' ? 32 : 128]]
  })
  return (ip) => {
    if (!ipaddr.isValid(ip)) return false
    const addr = ipaddr.process(ip)
    return ranges.some(([net, bits]) => net.kind() === addr.kind() && addr.match(net, bits))
  }
}
