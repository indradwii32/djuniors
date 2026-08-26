// ============================================
// Djuniors - JWT Utilities
// ============================================

import { JWTPayload } from '../types';

/**
 * Create a JWT token
 */
export async function createJWT(payload: Omit<JWTPayload, 'exp'>, secret: string, expiresInHours: number = 24): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        exp: now + (expiresInHours * 60 * 60)
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(fullPayload));

    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${data}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
    try {
        const [header, payload, signature] = token.split('.');

        if (!header || !payload || !signature) {
            return null;
        }

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const data = `${header}.${payload}`;
        const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            new TextEncoder().encode(data)
        );

        if (!valid) return null;

        const decoded: JWTPayload = JSON.parse(atob(payload));

        // Check expiration
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}
