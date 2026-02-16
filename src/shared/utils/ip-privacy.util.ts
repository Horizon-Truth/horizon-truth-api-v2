import { createHash, randomBytes } from 'crypto';

/**
 * Privacy-preserving IP address utilities for GDPR compliance.
 * Stores hashed IPs instead of full addresses to protect user privacy.
 */
export class IpPrivacyUtil {
    /**
     * Hash an IP address with a salt for privacy
     * @param ipAddress - Full IP address to hash
     * @param salt - Optional salt (will use env var or generate)
     * @returns Hashed IP address string
     */
    static hashIpAddress(ipAddress: string, salt?: string): string {
        if (!ipAddress) {
            return '';
        }

        const ipSalt = salt || process.env.IP_HASH_SALT || this.generateSalt();
        const hash = createHash('sha256');
        hash.update(ipAddress + ipSalt);
        return hash.digest('hex');
    }

    /**
     * Create a partial IP address for geolocation without full privacy violation
     * @param ipAddress - Full IP address
     * @returns Partial IP (e.g., "192.168.*.*" for IPv4, "2001:0db8:*" for IPv6)
     */
    static getPartialIp(ipAddress: string): string {
        if (!ipAddress) {
            return '';
        }

        // IPv4 handling
        if (ipAddress.includes('.')) {
            const parts = ipAddress.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.*.*`;
            }
        }

        // IPv6 handling
        if (ipAddress.includes(':')) {
            const parts = ipAddress.split(':');
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}:*`;
            }
        }

        return '*.*.*.*';
    }

    /**
     * Generate a random salt for IP hashing
     * Note: In production, store this in environment variables
     * @returns Random salt string
     */
    private static generateSalt(): string {
        return randomBytes(16).toString('hex');
    }

    /**
     * Process IP for privacy-preserving storage
     * @param ipAddress - Full IP address
     * @returns Object with hashed and partial IP
     */
    static processIp(ipAddress: string): { ipAddressHash: string; ipAddressPartial: string } {
        return {
            ipAddressHash: this.hashIpAddress(ipAddress),
            ipAddressPartial: this.getPartialIp(ipAddress),
        };
    }
}
