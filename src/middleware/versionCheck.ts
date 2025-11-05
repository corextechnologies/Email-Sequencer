import { Request, Response, NextFunction } from 'express';

// Phase 2: Set to new version to block old versions
// Update this to '1.2' to block 1.1 and older
const MIN_REQUIRED_VERSION = '1.2';

// Control enforcement via environment variable
// Set VERSION_ENFORCEMENT_ENABLED=true in .env when ready for Phase 2
const ENFORCEMENT_ENABLED = process.env.VERSION_ENFORCEMENT_ENABLED === 'true';

interface VersionRequest extends Request {
  version?: string;
}

/**
 * Middleware to check if the client app version meets minimum requirements
 * Phase 2: Blocks outdated versions when enforcement is enabled
 */
export function versionCheckMiddleware(
  req: VersionRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip version check for auth routes (login/register should always work)
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/register')) {
    return next();
  }

  const appVersion = req.headers['x-app-version'] as string;
  const platform = req.headers['x-platform'] as string;
  
  // Log version info for monitoring
  if (appVersion) {
    console.log(`📱 Version check: ${platform || 'unknown'} - ${appVersion} - ${req.method} ${req.path}`);
    req.version = appVersion;
    
    // Check if version is outdated
    if (isVersionOutdated(appVersion, MIN_REQUIRED_VERSION)) {
      console.warn(`⚠️ Outdated version detected: ${appVersion} (min required: ${MIN_REQUIRED_VERSION})`);
      
      // Block if enforcement is enabled
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
  } else {
    // Log missing version header
    console.warn('⚠️ Missing X-App-Version header in request:', req.path);
    // If enforcement is enabled and no version header, block old APKs without headers
    if (ENFORCEMENT_ENABLED) {
      res.status(426).json({
        success: false,
        error: {
          code: 'VERSION_OUTDATED',
          message: 'Your app version is outdated. Please update to the latest version.',
          requiredVersion: MIN_REQUIRED_VERSION,
          currentVersion: 'unknown'
        },
        updateRequired: true
      });
      return;
    }
  }

  // Allow request to proceed
  next();
}

/**
 * Compare semantic versions
 * Returns true if currentVersion is older than requiredVersion
 */
function isVersionOutdated(currentVersion: string, requiredVersion: string): boolean {
  const current = parseVersion(currentVersion);
  const required = parseVersion(requiredVersion);

  if (current.major < required.major) return true;
  if (current.major > required.major) return false;

  if (current.minor < required.minor) return true;
  if (current.minor > required.minor) return false;

  if (current.patch < required.patch) return true;
  return false;
}

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

