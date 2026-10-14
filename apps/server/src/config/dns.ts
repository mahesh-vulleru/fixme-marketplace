import dns from 'node:dns';

export const DEFAULT_DNS_SERVERS: readonly string[] = ['8.8.8.8', '1.1.1.1'];

/**
 * Parses comma-separated string or array of DNS server addresses into a cleaned string array.
 */
export function parseDnsServers(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Configures Node.js DNS resolver servers.
 *
 * This resolves the Windows / Node.js c-ares `querySrv ECONNREFUSED` issue
 * when resolving MongoDB Atlas `mongodb+srv://` connection strings by directing
 * SRV and hostname queries to reliable public or configured upstream DNS resolvers.
 *
 * Falls back to DEFAULT_DNS_SERVERS (['8.8.8.8', '1.1.1.1']) if custom servers are invalid.
 */
export function configureDns(customServers?: string | string[]): string[] {
  const envRaw = process.env.DNS_SERVERS;
  const configured = customServers ? parseDnsServers(customServers) : parseDnsServers(envRaw);
  const targetServers = configured.length > 0 ? configured : [...DEFAULT_DNS_SERVERS];

  try {
    dns.setServers(targetServers);
    return dns.getServers();
  } catch {
    // If the configured servers contained an invalid IP address or format, fall back to default
    try {
      dns.setServers([...DEFAULT_DNS_SERVERS]);
      return dns.getServers();
    } catch {
      return dns.getServers();
    }
  }
}

/**
 * Returns current active DNS resolver servers in Node.js runtime.
 */
export function getDnsServers(): string[] {
  return dns.getServers();
}

// Automatically configure upon initial module load
configureDns();

