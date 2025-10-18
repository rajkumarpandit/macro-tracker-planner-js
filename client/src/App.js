import React, { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  CircularProgress
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';

// Lazy load components to improve initial load time
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const FoodMasterPage = lazy(() => import('./components/FoodMaster/FoodMasterPage'));
const DailyLogPage = lazy(() => import('./components/DailyLog/DailyLogPage'));
const ReportPage = lazy(() => import('./components/Report/ReportPage'));

// Create a theme optimized for faster rendering
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  // Optimize animations for mobile
  transitions: {
    create: () => 'none', // Disable transitions for better performance
  },
  components: {
    // Reduce shadow depth for better rendering performance
    MuiPaper: {
      defaultProps: {
        elevation: 1,
      },
    },
  },
});

// Loading component
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
    <CircularProgress />
  </Box>
);

// Create a navigation component that syncs with routes
function NavigationBar() {
  const location = useLocation();
  const [value, setValue] = useState(0);
  
  // Update navigation value when location changes
  useEffect(() => {
    if (location.pathname === '/') {
      setValue(0);
    } else if (location.pathname === '/daily-log') {
      setValue(1);
    } else if (location.pathname === '/reports') {
      setValue(2);
    } else if (location.pathname === '/food-master') {
      setValue(3);
    }
  }, [location]);
  
  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1100 
      }} 
      elevation={3}
    >
      <BottomNavigation
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
      >
        <BottomNavigationAction 
          icon={<HomeIcon />} 
          component={Link} 
          to="/"
          sx={{ minWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Daily Log" 
          icon={<RestaurantMenuIcon />} 
          component={Link} 
          to="/daily-log"
          sx={{ minWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Reports" 
          icon={<BarChartIcon />} 
          component={Link} 
          to="/reports"
          sx={{ minWidth: '25%' }}
        />
        <BottomNavigationAction 
          label="Food DB" 
          icon={<MenuBookIcon />} 
          component={Link} 
          to="/food-master"
          sx={{ minWidth: '25%' }}
        />
      </BottomNavigation>
    </Paper>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static" color="primary">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ 
                flexGrow: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' } // Responsive font size
              }}>
                Macro Tracker
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Container component="main" sx={{ 
            flexGrow: 1, 
            py: { xs: 2, sm: 3 }, // Smaller padding on mobile
            px: { xs: 1, sm: 3 },  // Smaller padding on mobile
            mb: 7 // Add bottom margin to prevent content from being hidden by the navigation
          }}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/food-master" element={<FoodMasterPage />} />
                <Route path="/daily-log" element={<DailyLogPage />} />
                <Route path="/reports" element={<ReportPage />} />
              </Routes>
            </Suspense>
          </Container>
          
          <NavigationBar />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
