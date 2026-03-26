/**
 * Reads the base path injected by the Go server via <meta name="base-path">.
 * Returns "" when served at root, or e.g. "/disablarr" for subpath deployments.
 */
function getBasePath() {
    const meta = document.querySelector('meta[name="base-path"]');
    if (!meta) return '';
    const val = meta.getAttribute('content') || '';
    // "/" means root — normalize to empty string for easy concatenation.
    return val === '/' ? '' : val;
}

export const BASE_PATH = getBasePath();

export function apiBase() {
    return BASE_PATH + '/api';
}
