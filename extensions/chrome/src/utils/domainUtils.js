/**
 * Utility helpers for working with domain exclusion lists.
 * Provides normalization and validation helpers to keep behavior consistent
 * between options UI and background tracker logic.
 */

/**
 * Normalizes a single domain string.
 * - trims whitespace
 * - lowercases letters
 * - strips url scheme, credentials, ports, paths, query fragments
 * - strips leading "www." prefix
 * - validates resulting hostname according to RFC restrictions used by browsers
 *
 * @param {string} value Raw value provided by user or another component
 * @returns {string|null} Normalized domain or null if invalid
 */
function normalizeDomain(value) {
    if (typeof value !== 'string') {
        return null;
    }

    let domain = value.trim().toLowerCase();
    if (!domain) {
        return null;
    }

    // Remove protocol if present (http://, https://, etc.)
    domain = domain.replace(/^[a-z0-9+.-]+:\/\//, '');

    // Remove credentials if they leaked in (user:pass@host)
    const atIndex = domain.indexOf('@');
    if (atIndex !== -1) {
        domain = domain.slice(atIndex + 1);
    }

    // Remove path/query/hash/port parts
    const pathIndex = domain.search(/[/:?#]/);
    if (pathIndex !== -1) {
        domain = domain.slice(0, pathIndex);
    }

    // Remove ports (host:port)
    const portIndex = domain.indexOf(':');
    if (portIndex !== -1) {
        domain = domain.slice(0, portIndex);
    }

    // Remove leading www. prefix for consistency
    if (domain.startsWith('www.')) {
        domain = domain.slice(4);
    }

    // Trim leading/trailing dots
    domain = domain.replace(/^\.+/, '').replace(/\.+$/, '');

    if (!domain) {
        return null;
    }

    if (domain.length > 253) {
        return null;
    }

    if (!/^[a-z0-9.-]+$/.test(domain)) {
        return null;
    }

    if (domain.includes('..')) {
        return null;
    }

    const labels = domain.split('.');
    if (labels.length < 2) {
        return null;
    }

    for (const label of labels) {
        if (!label || label.length > 63) {
            return null;
        }

        if (!/^[a-z0-9-]+$/.test(label)) {
            return null;
        }

        if (label.startsWith('-') || label.endsWith('-')) {
            return null;
        }
    }

    return domain;
}

/**
 * Normalizes an array of domain strings and removes duplicates.
 *
 * @param {Array<string>} domains Raw list of domains
 * @returns {Array<string>} Normalized unique domains (preserving original order)
 */
function normalizeDomainList(domains) {
    if (!Array.isArray(domains)) {
        return [];
    }

    const seen = new Set();
    const result = [];

    for (const value of domains) {
        const normalized = normalizeDomain(value);
        if (!normalized) {
            continue;
        }
        if (seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

module.exports = {
    normalizeDomain,
    normalizeDomainList
};
