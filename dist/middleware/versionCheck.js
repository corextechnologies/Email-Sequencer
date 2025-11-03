"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionCheckMiddleware = versionCheckMiddleware;
// Phase 1: Set to current version to allow both old and new
// Update this to '1.0.1' when ready to enforce (Phase 2)
const MIN_REQUIRED_VERSION = '1.0.0';
// Control enforcement via environment variable
// Set VERSION_ENFORCEMENT_ENABLED=true in .env when ready for Phase 2
const ENFORCEMENT_ENABLED = process.env.VERSION_ENFORCEMENT_ENABLED === 'true';
/**
 * Middleware to check if the client app version meets minimum requirements
 * Currently in monitoring mode (Phase 1) - logs versions but doesn't block
 */
function versionCheckMiddleware(req, res, next) {
    // Skip version check for auth routes (login/register should always work)
    if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/register')) {
        return next();
    }
    const appVersion = req.headers['x-app-version'];
    const platform = req.headers['x-platform'];
    // Log version info for monitoring (Phase 1)
    if (appVersion) {
        console.log(`📱 Version check: ${platform || 'unknown'} - ${appVersion} - ${req.method} ${req.path}`);
        req.version = appVersion;
        // Check if version is outdated (but don't block in Phase 1)
        if (isVersionOutdated(appVersion, MIN_REQUIRED_VERSION)) {
            console.warn(`⚠️ Outdated version detected: ${appVersion} (min required: ${MIN_REQUIRED_VERSION})`);
            // Only block if enforcement is enabled (Phase 2)
            if (ENFORCEMENT_ENABLED) {
                res.status(426).json({
                    success: false,
                    error: {
                        code: 'VERSION_OUTDATED',
                        message: 'Your app version is outdated. Please update to the latest version.',
                        requiredVersion: MIN_REQUIRED_VERSION,
                        currentVersion: appVersion
                    },
                    updateRequired: true
                });
                return;
            }
        }
    }
    else {
        // Log missing version header for monitoring
        console.warn('⚠️ Missing X-App-Version header in request:', req.path);
    }
    // Allow request to proceed in Phase 1 (monitoring mode)
    next();
}
/**
 * Compare semantic versions
 * Returns true if currentVersion is older than requiredVersion
 */
function isVersionOutdated(currentVersion, requiredVersion) {
    const current = parseVersion(currentVersion);
    const required = parseVersion(requiredVersion);
    if (current.major < required.major)
        return true;
    if (current.major > required.major)
        return false;
    if (current.minor < required.minor)
        return true;
    if (current.minor > required.minor)
        return false;
    if (current.patch < required.patch)
        return true;
    return false;
}
function parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
    };
}
//# sourceMappingURL=versionCheck.js.map