import React, { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useIsAdmin } from './utils/adminUtils';
import theme, { appColors } from './theme';
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
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MenuIcon from '@mui/icons-material/Menu';

import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import MaintenanceRoute from './components/Auth/MaintenanceRoute';
import { cleanupLegacyData } from './firebase/cleanupUtils';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const FoodMasterPage = lazy(() => import('./components/FoodMaster/FoodMasterPage'));
const DailyLogPage = lazy(() => import('./components/DailyLog/DailyLogPage'));
const WeightLogPage = lazy(() => import('./components/WeightLog/WeightLogPage'));
const ReportPage = lazy(() => import('./components/Report/ReportPage'));
const MacroTargetPage = lazy(() => import('./components/MacroTarget/MacroTargetPage'));
const Login = lazy(() => import('./components/Auth/Login'));
const Signup = lazy(() => import('./components/Auth/Signup'));
const ForgotPassword = lazy(() => import('./components/Auth/ForgotPassword'));
const LandingPage = lazy(() => import('./components/LandingPage/LandingPage'));
const AdminPage = lazy(() => import('./components/Admin/AdminPage'));
const InitializeAdminCollection = lazy(() => import('./components/InitializeAdminCollection'));
const TestFirestorePermissions = lazy(() => import('./components/TestFirestorePermissions'));
const DataDebugger = lazy(() => import('./components/DataDebugger'));
const MyProfilePage = lazy(() => import('./components/Profile/MyProfilePage'));
const CaloriesBurntPage = lazy(() => import('./components/CaloriesBurnt/CaloriesBurntPage'));
const ExercisePage = lazy(() => import('./components/Exercise/ExercisePage'));
const MaintenancePage = lazy(() => import('./components/Maintenance/MaintenancePage'));

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
    <CircularProgress sx={{ color: appColors.blue }} />
  </Box>
);

function UserMenu() {
  const { currentUser, userDetails, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const getUserName = () => {
    if (userDetails?.displayName) return userDetails.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) {
      const n = currentUser.email.split('@')[0];
      return n.charAt(0).toUpperCase() + n.slice(1);
    }
    return 'User';
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMyProfile = () => { handleMenuClose(); navigate('/my-profile'); };
  const handleLogout = async () => {
    try { await logout(); handleMenuClose(); navigate('/login'); }
    catch (err) { console.error('Logout error:', err); }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' }, opacity: 0.85, fontSize: '0.85rem' }}>
        {getUserName()}
      </Typography>
      <IconButton
        color="inherit"
        aria-label="user menu"
        onClick={handleMenuOpen}
        size="small"
        sx={{ bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
      >
        <AccountCircleIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1, minWidth: 180,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #E2E8F0',
            borderRadius: 2,
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleMyProfile} sx={{ gap: 1, fontSize: '0.9rem', py: 1.2 }}>
          <PersonIcon fontSize="small" sx={{ color: '#2563EB' }} />
          My Profile
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout} sx={{ gap: 1, fontSize: '0.9rem', py: 1.2, color: '#DC2626' }}>
          <LogoutIcon fontSize="small" />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}

function NavigationBar() {
  const location = useLocation();
  const [value, setValue] = useState(0);
  const { currentUser } = useAuth();
  const { isAdmin: userIsAdmin } = useIsAdmin(currentUser);

  useEffect(() => {
    const paths = ['/dashboard', '/daily-log', '/calories-burnt', '/weight-log', '/reports', '/macro-target', '/food-master'];
    const idx = paths.indexOf(location.pathname);
    if (idx >= 0) setValue(idx);
  }, [location]);

  if (location.pathname === '/my-profile' || location.pathname === '/maintenance') return null;

  const navSx = { minWidth: userIsAdmin ? '12.5%' : '14.29%' };

  return (
    <Paper sx={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
      borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
      boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.04)',
    }}>
      <BottomNavigation value={value} onChange={(_, v) => setValue(v)} showLabels={false}>
        <BottomNavigationAction icon={<HomeIcon />} component={Link} to="/dashboard" sx={navSx} />
        <BottomNavigationAction icon={<RestaurantMenuIcon />} component={Link} to="/daily-log" sx={navSx} />
        <BottomNavigationAction icon={<LocalFireDepartmentIcon />} component={Link} to="/calories-burnt" sx={navSx} />
        <BottomNavigationAction icon={<MonitorWeightIcon />} component={Link} to="/weight-log" sx={navSx} />
        <BottomNavigationAction icon={<BarChartIcon />} component={Link} to="/reports" sx={navSx} />
        {userIsAdmin && (
          <BottomNavigationAction icon={<SupervisorAccountIcon />} component={Link} to="/admin" sx={{ minWidth: '12.5%' }} />
        )}
      </BottomNavigation>
    </Paper>
  );
}

function SidebarDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isAdmin: userIsAdmin } = useIsAdmin(currentUser);

  const handleNavigation = (path) => { navigate(path); onClose(); };

  const menuItems = [
    { text: 'Dashboard',          icon: <HomeIcon />,                path: '/dashboard' },
    { text: 'Daily Food Log',     icon: <RestaurantMenuIcon />,      path: '/daily-log' },
    { text: 'Calories Burnt',     icon: <LocalFireDepartmentIcon />, path: '/calories-burnt' },
    { text: 'Body Parameter Log', icon: <MonitorWeightIcon />,       path: '/weight-log' },
    { text: 'Reports',            icon: <BarChartIcon />,            path: '/reports' },
    { text: 'Exercise Module',    icon: <FitnessCenterIcon />,       path: '/exercise' },
    { text: 'Macro Targets',      icon: <TrackChangesIcon />,        path: '/macro-target' },
    { text: 'Food Master',        icon: <MenuBookIcon />,            path: '/food-master' },
  ];
  if (userIsAdmin) menuItems.push({ text: 'Admin', icon: <SupervisorAccountIcon />, path: '/admin' });

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, #1B3A6B 0%, #112649 100%)' }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
          Macro Tracker
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>
          Nutrition & Fitness
        </Typography>
      </Box>
      <Box sx={{ background: 'linear-gradient(180deg, #1B3A6B 0%, #112649 100%)', flex: 1 }}>
        <List sx={{ pt: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{ py: 1.2, px: 2.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    sx: { color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem', fontWeight: 500 }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

function ConditionalAppBar() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event?.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) return;
    setDrawerOpen(open);
  };

  if (location.pathname === '/maintenance') return null;

  return (
    <>
      <SidebarDrawer open={drawerOpen} onClose={toggleDrawer(false)} />
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 52, sm: 56 } }}>
          {currentUser && (
            <IconButton color="inherit" aria-label="open menu" onClick={toggleDrawer(true)} edge="start" sx={{ mr: 1.5 }} size="small">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{
            flexGrow: 1, fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 700, letterSpacing: '-0.01em'
          }}>
            Macro Tracker
          </Typography>
          {currentUser && <UserMenu />}
        </Toolbar>
      </AppBar>
    </>
  );
}

function AppContent() {
  const { currentUser } = useAuth();
  const [dataCleanedUp, setDataCleanedUp] = useState(false);

  useEffect(() => {
    const runCleanup = async () => {
      try {
        if (!dataCleanedUp) { await cleanupLegacyData(); setDataCleanedUp(true); }
      } catch (error) { console.error('Error during data cleanup:', error); }
    };
    runCleanup();
  }, [dataCleanedUp]);

  return (
    <Router>
      <AppRoutes currentUser={currentUser} />
    </Router>
  );
}

function AppRoutes({ currentUser }) {
  const location = useLocation();
  const isMaintenancePage = location.pathname === '/maintenance';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
      <ConditionalAppBar />
      <Container
        component="main"
        sx={{
          flexGrow: 1,
          py: isMaintenancePage ? 0 : { xs: 2, sm: 3 },
          px: isMaintenancePage ? 0 : { xs: 1, sm: 2 },
          mb: currentUser && !isMaintenancePage ? 7 : 0,
          maxWidth: isMaintenancePage ? false : undefined
        }}
        disableGutters={isMaintenancePage}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" /> : <Signup />} />
            <Route path="/forgot-password" element={currentUser ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
            <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <LandingPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />

            <Route path="/dashboard" element={<PrivateRoute><MaintenanceRoute><Dashboard /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/food-master" element={<PrivateRoute><MaintenanceRoute><FoodMasterPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/daily-log" element={<PrivateRoute><MaintenanceRoute><DailyLogPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/calories-burnt" element={<PrivateRoute><MaintenanceRoute><CaloriesBurntPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/weight-log" element={<PrivateRoute><MaintenanceRoute><WeightLogPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><MaintenanceRoute><ReportPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/exercise" element={<PrivateRoute><MaintenanceRoute><ExercisePage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/macro-target" element={<PrivateRoute><MaintenanceRoute><MacroTargetPage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/my-profile" element={<PrivateRoute><MaintenanceRoute><MyProfilePage /></MaintenanceRoute></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute requireAdmin={true}><AdminPage /></PrivateRoute>} />
            <Route path="/admin/initialize" element={<PrivateRoute><InitializeAdminCollection /></PrivateRoute>} />
            <Route path="/admin/test-permissions" element={<PrivateRoute><TestFirestorePermissions /></PrivateRoute>} />
            <Route path="/debug-data" element={<PrivateRoute><DataDebugger /></PrivateRoute>} />
            <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/'} />} />
          </Routes>
        </Suspense>
      </Container>
      {currentUser && <NavigationBar />}
    </Box>
  );
}

function App() {
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
