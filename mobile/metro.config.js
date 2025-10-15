const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure we're only working within the mobile directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Aggressively block backend files and Node.js modules
config.resolver = {
  ...config.resolver,
  blockList: [
    // Block all parent directory files
    /\.\.[\/\\](?!mobile).*/,
    // Block specific backend paths
    /\.\.[\/\\]src[\/\\].*/,
    /\.\.[\/\\]dist[\/\\].*/,
    /\.\.[\/\\]node_modules[\/\\].*/,
    // Block Node.js specific modules that don't work in React Native
    /node_modules[\/\\].*[\/\\]dotenv[\/\\].*/,
    /node_modules[\/\\].*[\/\\]fs[\/\\].*/,
    /node_modules[\/\\].*[\/\\]path[\/\\].*/,
    /node_modules[\/\\].*[\/\\]os[\/\\].*/,
    /node_modules[\/\\].*[\/\\]crypto[\/\\].*/,
    /node_modules[\/\\].*[\/\\]buffer[\/\\].*/,
    /node_modules[\/\\].*[\/\\]stream[\/\\].*/,
    /node_modules[\/\\].*[\/\\]util[\/\\].*/,
    // Block backend-specific packages
    /node_modules[\/\\].*[\/\\]bcryptjs[\/\\].*/,
    /node_modules[\/\\].*[\/\\]jsonwebtoken[\/\\].*/,
    /node_modules[\/\\].*[\/\\]pg[\/\\].*/,
    /node_modules[\/\\].*[\/\\]express[\/\\].*/,
    /node_modules[\/\\].*[\/\\]helmet[\/\\].*/,
    /node_modules[\/\\].*[\/\\]morgan[\/\\].*/,
    /node_modules[\/\\].*[\/\\]cors[\/\\].*/,
  ],
  // Force resolution to only look in mobile directory
  alias: {
    // Prevent any accidental imports from parent directory
    '../src': path.resolve(__dirname, 'src'),
    '../dist': path.resolve(__dirname, 'src'),
  },
};

module.exports = config;
