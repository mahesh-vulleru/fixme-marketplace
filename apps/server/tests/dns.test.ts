import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  configureDns,
  getDnsServers,
  parseDnsServers,
  DEFAULT_DNS_SERVERS,
} from '../src/config/dns';

describe('DNS Configuration & SRV Resolution Support', () => {
  const originalEnvDns = process.env.DNS_SERVERS;

  beforeEach(() => {
    delete process.env.DNS_SERVERS;
  });

  afterEach(() => {
    if (originalEnvDns !== undefined) {
      process.env.DNS_SERVERS = originalEnvDns;
    } else {
      delete process.env.DNS_SERVERS;
    }
    configureDns();
  });

  describe('parseDnsServers', () => {
    it('returns empty array when undefined or empty string', () => {
      expect(parseDnsServers(undefined)).toEqual([]);
      expect(parseDnsServers('')).toEqual([]);
      expect(parseDnsServers('   ')).toEqual([]);
    });

    it('parses comma-separated string and trims whitespace', () => {
      expect(parseDnsServers('8.8.8.8, 1.1.1.1,  8.8.4.4 ')).toEqual([
        '8.8.8.8',
        '1.1.1.1',
        '8.8.4.4',
      ]);
    });

    it('filters out empty segments from strings', () => {
      expect(parseDnsServers('8.8.8.8,, ,1.1.1.1')).toEqual(['8.8.8.8', '1.1.1.1']);
    });

    it('handles string array input', () => {
      expect(parseDnsServers([' 8.8.8.8 ', '1.1.1.1', ''])).toEqual(['8.8.8.8', '1.1.1.1']);
    });
  });

  describe('configureDns', () => {
    it('sets default DNS servers (8.8.8.8, 1.1.1.1) when no custom config is provided', () => {
      const active = configureDns();
      expect(active).toEqual(expect.arrayContaining([...DEFAULT_DNS_SERVERS]));
      expect(getDnsServers()).toEqual(expect.arrayContaining([...DEFAULT_DNS_SERVERS]));
    });

    it('sets custom DNS servers when provided via argument', () => {
      const custom = ['1.1.1.1', '8.8.4.4'];
      const active = configureDns(custom);
      expect(active).toEqual(custom);
      expect(getDnsServers()).toEqual(custom);
    });

    it('sets custom DNS servers when provided via process.env.DNS_SERVERS', () => {
      process.env.DNS_SERVERS = '1.0.0.1, 8.8.4.4';
      const active = configureDns();
      expect(active).toEqual(['1.0.0.1', '8.8.4.4']);
      expect(getDnsServers()).toEqual(['1.0.0.1', '8.8.4.4']);
    });

    it('falls back to default DNS servers if invalid IP strings are provided without throwing', () => {
      const active = configureDns('not-a-valid-ip-address, still-invalid');
      expect(active).toEqual(expect.arrayContaining([...DEFAULT_DNS_SERVERS]));
    });
  });
});

