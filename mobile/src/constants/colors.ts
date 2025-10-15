// Color constants for the Email Marketing App
// Primary colors provided by user
export const COLORS = {
  // Primary brand colors
  primary: '#0F3B59',      // Dark blue-gray
  secondary: '#0DA9D9',    // Light blue
  
  // Text colors
  text: {
    primary: '#0F3B59',     // Main text color
    secondary: '#6B7280',   // Secondary text
    light: '#9CA3AF',       // Light text
    white: '#FFFFFF',       // White text
    dark: '#1F2937',        // Dark text
  },
  
  // Background colors
  background: {
    primary: '#FFFFFF',     // White backgrounds
    secondary: '#F9FAFB',   // Light gray backgrounds
    tertiary: '#F3F4F6',   // Medium gray backgrounds
    card: '#FFFFFF',        // Card backgrounds
    modal: '#FFFFFF',       // Modal backgrounds
  },
  
  // Status colors
  status: {
    success: '#10B981',      // Green for success states
    warning: '#F59E0B',     // Orange for warnings
    error: '#EF4444',       // Red for errors
    info: '#0DA9D9',        // Light blue for info
  },
  
  // Button colors
  button: {
    primary: '#0F3B59',      // Primary button background
    secondary: '#0DA9D9',    // Secondary button background
    success: '#10B981',      // Success button background
    danger: '#EF4444',      // Danger button background
    disabled: '#9CA3AF',    // Disabled button background
  },
  
  // Border colors
  border: {
    light: '#E5E7EB',       // Light borders
    medium: '#D1D5DB',      // Medium borders
    dark: '#9CA3AF',        // Dark borders
  },
  
  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.2)',
    dark: 'rgba(0, 0, 0, 0.3)',
  },
  
  // Icon colors
  icon: {
    primary: '#0F3B59',     // Primary icon color
    secondary: '#0DA9D9',    // Secondary icon color
    light: '#9CA3AF',       // Light icon color
    white: '#FFFFFF',       // White icon color
  },
  
  // Legacy colors (to be gradually replaced)
  legacy: {
    blue: '#3B82F6',        // Legacy blue
    green: '#22C55E',       // Legacy green
    red: '#EF4444',         // Legacy red
    yellow: '#F59E0B',      // Legacy yellow
    purple: '#8B5CF6',      // Legacy purple
    gray: '#6B7280',        // Legacy gray
  }
} as const;

// Helper function to get color with opacity
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Common color combinations
export const COLOR_COMBINATIONS = {
  primaryButton: {
    backgroundColor: COLORS.button.primary,
    color: COLORS.text.white,
  },
  secondaryButton: {
    backgroundColor: COLORS.button.secondary,
    color: COLORS.text.white,
  },
  successButton: {
    backgroundColor: COLORS.button.success,
    color: COLORS.text.white,
  },
  dangerButton: {
    backgroundColor: COLORS.button.danger,
    color: COLORS.text.white,
  },
  card: {
    backgroundColor: COLORS.background.card,
    borderColor: COLORS.border.light,
  },
  input: {
    backgroundColor: COLORS.background.primary,
    borderColor: COLORS.border.medium,
    color: COLORS.text.primary,
  },
} as const;
