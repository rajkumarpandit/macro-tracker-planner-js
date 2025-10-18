import React, { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useIsAdmin } from './utils/adminUtils';
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
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

// Import authentication components
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import { cleanupLegacyData } from './firebase/cleanupUtils';

// Lazy load components to improve initial load time
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const FoodMasterPage = lazy(() => import('./components/FoodMaster/FoodMasterPage'));
const DailyLogPage = lazy(() => import('./components/DailyLog/DailyLogPage'));
const ReportPage = lazy(() => import('./components/Report/ReportPage'));
const Login = lazy(() => import('./components/Auth/Login'));
const Signup = lazy(() => import('./components/Auth/Signup'));
const LandingPage = lazy(() => import('./components/LandingPage/LandingPage'));
const AdminManagement = lazy(() => import('./components/Admin/AdminManagement'));
const InitializeAdminCollection = lazy(() => import('./components/InitializeAdminCollection'));
const TestFirestorePermissions = lazy(() => import('./components/TestFirestorePermissions'));

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

// User menu component
function UserMenu() {
  const { currentUser, userDetails, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useLocation();
  
  // Get the display name with proper fallbacks
  const getUserName = () => {
    if (userDetails?.displayName) return userDetails.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) {
      // Only fall back to email if no name is available
      const emailName = currentUser.email.split('@')[0];
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return "User"; // Final fallback
  };
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
        Welcome, {getUserName()}
      </Typography>
      <IconButton
        color="inherit"
        aria-label="user menu"
        aria-controls="user-menu"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        size="small"
      >
        <AccountCircleIcon />
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}

// Create a navigation component that syncs with routes
function NavigationBar() {
  const location = useLocation();
  const [value, setValue] = useState(0);
  const { currentUser } = useAuth();
  const { isAdmin: userIsAdmin } = useIsAdmin(currentUser);
  
  // Update navigation value when location changes
  useEffect(() => {
    if (location.pathname === '/dashboard') {
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
          to="/dashboard"
          sx={{ minWidth: userIsAdmin ? '20%' : '25%' }}
        />
        <BottomNavigationAction 
          label="Daily Log" 
          icon={<RestaurantMenuIcon />} 
          component={Link} 
          to="/daily-log"
          sx={{ minWidth: userIsAdmin ? '20%' : '25%' }}
        />
        <BottomNavigationAction 
          label="Reports" 
          icon={<BarChartIcon />} 
          component={Link} 
          to="/reports"
          sx={{ minWidth: userIsAdmin ? '20%' : '25%' }}
        />
        {userIsAdmin && (
          <>
            <BottomNavigationAction 
              label="Food DB" 
              icon={<MenuBookIcon />} 
              component={Link} 
              to="/food-master"
              sx={{ minWidth: '20%' }}
            />
            <BottomNavigationAction 
              label="Admin" 
              icon={<SupervisorAccountIcon />} 
              component={Link} 
              to="/admin"
              sx={{ minWidth: '20%' }}
            />
          </>
        )}
      </BottomNavigation>
    </Paper>
  );
}

// AppContent component with routes
function AppContent() {
  const { currentUser } = useAuth();
  const [dataCleanedUp, setDataCleanedUp] = useState(false);
  
  // Run data cleanup once on app initialization
  useEffect(() => {
    const runCleanup = async () => {
      try {
        if (!dataCleanedUp) {
          await cleanupLegacyData();
          setDataCleanedUp(true);
        }
      } catch (error) {
        console.error('Error during data cleanup:', error);
      }
    };
    
    runCleanup();
  }, [dataCleanedUp]);

  return (
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
            
            {currentUser && <UserMenu />}
          </Toolbar>
        </AppBar>
        
        <Container component="main" sx={{ 
          flexGrow: 1, 
          py: { xs: 2, sm: 3 }, // Smaller padding on mobile
          px: { xs: 1, sm: 3 },  // Smaller padding on mobile
          mb: currentUser ? 7 : 0 // Add bottom margin only when user is logged in
        }}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
              <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" /> : <Signup />} />
              <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <LandingPage />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/food-master" element={
                <PrivateRoute requireAdmin={true}>
                  <FoodMasterPage />
                </PrivateRoute>
              } />
              <Route path="/daily-log" element={
                <PrivateRoute>
                  <DailyLogPage />
                </PrivateRoute>
              } />
              <Route path="/reports" element={
                <PrivateRoute>
                  <ReportPage />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute requireAdmin={true}>
                  <AdminManagement />
                </PrivateRoute>
              } />
              
              <Route path="/admin/initialize" element={
                <PrivateRoute>
                  <InitializeAdminCollection />
                </PrivateRoute>
              } />
              
              <Route path="/admin/test-permissions" element={
                <PrivateRoute>
                  <TestFirestorePermissions />
                </PrivateRoute>
              } />
              
              {/* Redirect any other routes */}
              <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/"} />} />
            </Routes>
          </Suspense>
        </Container>
        
        {currentUser && <NavigationBar />}
      </Box>
    </Router>
  );
}

function App() {
  // Wrap the entire app with the AuthProvider
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
