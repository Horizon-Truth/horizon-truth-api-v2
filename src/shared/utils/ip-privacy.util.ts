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