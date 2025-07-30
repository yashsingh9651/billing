/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: '#EFF6FF',  // Very light blue
          100: '#DBEAFE', // Light blue
          200: '#BFDBFE', // Lighter blue
          300: '#93C5FD', // Light medium blue
          400: '#60A5FA', // Medium blue
          500: '#3B82F6', // Primary blue
          600: '#2563EB', // Dark blue
          700: '#1D4ED8', // Darker blue
          800: '#1E40AF', // Very dark blue
          900: '#1E3A8A', // Extremely dark blue
          950: '#172554', // Almost navy blue
        },
        // Neutral colors
        neutral: {
          50: '#F9FAFB',  // Almost white
          100: '#F3F4F6', // Very light gray
          200: '#E5E7EB', // Light gray
          300: '#D1D5DB', // Medium light gray
          400: '#9CA3AF', // Medium gray
          500: '#6B7280', // Medium dark gray
          600: '#4B5563', // Dark gray
          700: '#374151', // Darker gray
          800: '#1F2937', // Very dark gray
          900: '#111827', // Almost black
          950: '#030712', // Black
        },
        // Accent colors for success, warning, error
        success: '#10B981', // Green
        warning: '#F59E0B', // Amber
        error: '#EF4444',   // Red
        info: '#3B82F6',    // Blue (same as primary-500)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'DEFAULT': '0.375rem',
      }
    },
  },
  plugins: [],
};
