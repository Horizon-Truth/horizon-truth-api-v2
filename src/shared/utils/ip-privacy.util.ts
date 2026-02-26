import { createHash, randomBytes } from 'crypto';

/**
 * Privacy-preserving IP address utilities for GDPR compliance.
 * Stores hashed IPs instead of full addresses to protect user privacy.
 */
export class IpPrivacyUtil {
  /**