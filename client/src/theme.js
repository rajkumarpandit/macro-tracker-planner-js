import { createTheme } from '@mui/material/styles';

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Single source of truth for all colors and design decisions used app-wide.
// Import `appColors` and the shared `sx` helpers in any component that needs them.

export const appColors = {
  // Brand
  navy:         '#1B3A6B',   // deep navy – primary brand
  navyDark:     '#112649',   // darker navy (hover, drawer bg)
  navyLight:    '#2952A3',   // lighter navy (active state tint)
  blue:         '#2563EB',   // accent / CTA buttons
  blueDark:     '#1D4ED8',   // button hover
  blueLight:    '#EFF6FF',   // light blue tint for surfaces

  // Macro colours
  protein:      '#7C3AED',   // violet  – protein
  proteinLight: '#F5F3FF',
  carbs:        '#D97706',   // amber   – carbohydrates
  carbsLight:   '#FFFBEB',
  fat:          '#DB2777',   // pink    – fat
  fatLight:     '#FDF2F8',
  calories:     '#2563EB',   // blue    – calories

  // Semantic
  success:      '#059669',   // emerald green  – in range / positive
  successLight: '#ECFDF5',
  warning:      '#D97706',   // amber          – approaching limit
  warningLight: '#FFFBEB',
  error:        '#DC2626',   // red            – over limit / danger
  errorLight:   '#FEF2F2',

  // Neutrals
  bgPage:       '#F1F5F9',   // page background
  bgCard:       '#FFFFFF',
  border:       '#E2E8F0',
  borderDark:   '#CBD5E1',
  textPrimary:  '#1E293B',
  textSecondary:'#64748B',
  textDisabled: '#94A3B8',

  // Meal badge colours – kept here so every component is consistent
  meals: {
    'Pre-Breakfast':  { bg: '#F5F3FF', text: '#5B21B6' },
    'Pre-Workout':    { bg: '#EFF6FF', text: '#1D4ED8' },
    'Breakfast':      { bg: '#FFFBEB', text: '#B45309' },
    'Pre-Lunch':      { bg: '#FDF2F8', text: '#9D174D' },
    'Lunch':          { bg: '#ECFDF5', text: '#065F46' },
    'Evening-Snacks': { bg: '#FFF7ED', text: '#C2410C' },
    'Dinner':         { bg: '#EFF6FF', text: '#1E40AF' },
    'Post-Workout':   { bg: '#F0FDF4', text: '#166534' },
    'Extra Snacks':   { bg: '#FFF1F2', text: '#9F1239' },
    'Snack':          { bg: '#FFF7ED', text: '#C2410C' },
    'Others':         { bg: '#F8FAFC', text: '#475569' },
  },

  // Protein-source badge colours
  proteinSources: {
    'Vegetarian':  { bg: '#ECFDF5', text: '#065F46' },
    'Animal':      { bg: '#FEF2F2', text: '#991B1B' },
    'Mixed':       { bg: '#FFFBEB', text: '#92400E' },
    'Low-Protein': { bg: '#FDF4FF', text: '#6B21A8' },
  },
};

// ─── Shared sx snippets ──────────────────────────────────────────────────────
// Reusable MUI sx objects — spread into sx props to keep components DRY.

export const cardSx = {
  bgcolor: appColors.bgCard,
  borderRadius: 2,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  border: `1px solid ${appColors.border}`,
  p: { xs: 1.5, sm: 2 },
  mb: 2,
};

export const sectionTitleSx = {
  fontWeight: 700,
  fontSize: { xs: '0.85rem', sm: '0.9rem' },
  color: appColors.navy,
  mb: 1.5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const pageTitleSx = {
  fontWeight: 700,
  fontSize: { xs: '1.2rem', sm: '1.4rem' },
  color: appColors.textPrimary,
};

export const primaryBtnSx = {
  textTransform: 'none',
  borderRadius: 2,
  fontWeight: 600,
  background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
  '&:hover': {
    background: `linear-gradient(135deg, ${appColors.blueDark} 0%, ${appColors.navy} 100%)`,
  },
  '&:disabled': {
    background: appColors.border,
    color: appColors.textDisabled,
  },
};

export const outlinedBtnSx = {
  textTransform: 'none',
  borderRadius: 2,
  fontWeight: 600,
  borderColor: appColors.blue,
  color: appColors.blue,
  '&:hover': {
    borderColor: appColors.blueDark,
    backgroundColor: appColors.blueLight,
  },
};

// ─── MUI Theme ───────────────────────────────────────────────────────────────

const theme = createTheme({
  palette: {
    primary: {
      main:  appColors.blue,
      dark:  appColors.navyDark,
      light: appColors.navyLight,
    },
    secondary: {
      main: appColors.protein,
    },
    success: {
      main: appColors.success,
    },
    warning: {
      main: appColors.warning,
    },
    error: {
      main: appColors.error,
    },
    background: {
      default: appColors.bgPage,
      paper:   appColors.bgCard,
    },
    text: {
      primary:   appColors.textPrimary,
      secondary: appColors.textSecondary,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  transitions: {
    create: () => 'none', // disabled for mobile perf
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: appColors.bgPage,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${appColors.border}`,
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${appColors.border}`,
          borderRadius: 10,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
          boxShadow: 'none',
          '&:hover': {
            background: `linear-gradient(135deg, ${appColors.blueDark} 0%, ${appColors.navy} 100%)`,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          },
        },
        outlinedPrimary: {
          borderColor: appColors.blue,
          color: appColors.blue,
          '&:hover': {
            borderColor: appColors.blueDark,
            backgroundColor: appColors.blueLight,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          background: `linear-gradient(135deg, ${appColors.navy} 0%, ${appColors.navyDark} 100%)`,
          boxShadow: '0 2px 8px rgba(27, 58, 107, 0.3)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: appColors.bgCard,
          borderTop: `1px solid ${appColors.border}`,
          height: 56,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: appColors.textSecondary,
          '&.Mui-selected': {
            color: appColors.blue,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover fieldset': { borderColor: appColors.blue },
            '&.Mui-focused fieldset': { borderColor: appColors.blue },
          },
          '& label.Mui-focused': { color: appColors.blue },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: appColors.bgPage,
          color: appColors.textSecondary,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: `2px solid ${appColors.border}`,
        },
        body: {
          borderBottom: `1px solid ${appColors.border}`,
          fontSize: '0.85rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: appColors.border,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: 280,
          background: `linear-gradient(180deg, ${appColors.navy} 0%, ${appColors.navyDark} 100%)`,
          color: '#FFFFFF',
          border: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: appColors.border,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
