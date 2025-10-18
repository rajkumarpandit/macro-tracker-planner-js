import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Alert, 
  Button,
  Switch,
  CircularProgress,
  Divider,
  Snackbar,
  IconButton,
  Tooltip,
  FormControlLabel
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useIsAdmin, addAdmin, removeAdmin } from '../../utils/adminUtils';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const AdminManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isAdmin: userIsAdmin } = useIsAdmin(currentUser);
  
  useEffect(() => {
    // Load all users from Firestore
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'users');
        
        try {
          const usersSnapshot = await getDocs(usersCollection);
          
          if (usersSnapshot.empty) {
            setUsers([]);
            setLoading(false);
            return;
          }
          
          const usersList = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            
            // Make sure email exists
            if (!userData.email) {
              console.warn(`User ${userDoc.id} has no email field`);
              return {
                id: userDoc.id,
                email: "unknown@example.com",
                displayName: "Unknown User",
                isAdmin: false,
                isEnabled: false,
                createdAt: userData.createdAt || null
              };
            }
            
            // Check if user is admin using our admin utils
            let isAdmin = false;
            try {
              const adminRef = doc(db, 'admin_users', userData.email.toLowerCase());
              const adminDoc = await getDoc(adminRef);
              isAdmin = adminDoc.exists();
            } catch (err) {
              console.error("Error checking admin status:", err);
            }
            
            return {
              id: userDoc.id,
              email: userData.email,
              displayName: userData.displayName || userData.email.split('@')[0],
              isAdmin: isAdmin,
              isEnabled: userData.isEnabled !== false, // Default to enabled if not specified
              createdAt: userData.createdAt || null
            };
          }));
          
          // Filter out any null entries (from errors)
          const filteredUsers = usersList.filter(user => user !== null);
          
          setUsers(filteredUsers);
          setLoading(false);
        } catch (fetchError) {
          console.error("Error in getDocs:", fetchError);
          if (fetchError.message.includes("permission-denied") || 
              fetchError.message.includes("Missing or insufficient permissions")) {
            setError("Permission denied when accessing user data. Please update Firestore rules and redeploy.");
          } else {
            setError(`Failed to load users: ${fetchError.message}`);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error in fetchUsers:", err);
        setError(`Failed to load users. Please try again. Error: ${err.message}`);
        setLoading(false);
      }
    };
    if (userIsAdmin) {
      fetchUsers();
    } else {
      console.log("User is not admin, skipping user fetch");
      setLoading(false);
    }
  }, [userIsAdmin]);

  // Function to toggle admin status
  const handleToggleAdmin = async (user) => {
    try {
      if (user.email === currentUser.email) {
        setNotification({
          open: true,
          message: "You cannot remove admin privileges from yourself!",
          severity: "error"
        });
        return;
      }

      let success = false;
      if (user.isAdmin) {
        // Remove admin status using adminUtils
        success = await removeAdmin(user.email);
      } else {
        // Add admin status using adminUtils
        success = await addAdmin(user.email);
      }

      if (!success) {
        throw new Error("Failed to update admin status");
      }

      // Update state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u
      ));

      setNotification({
        open: true,
        message: `Admin ${user.isAdmin ? 'removed from' : 'granted to'} ${user.displayName || user.email}`,
        severity: "success"
      });
    } catch (err) {
      console.error("Error toggling admin status:", err);
      setNotification({
        open: true,
        message: "Failed to update admin status. Please try again.",
        severity: "error"
      });
    }
  };

  // Function to toggle enabled status
  const handleToggleEnabled = async (user) => {
    try {
      if (user.email === currentUser.email) {
        setNotification({
          open: true,
          message: "You cannot disable your own account!",
          severity: "error"
        });
        return;
      }

      // Update user document with new isEnabled status
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isEnabled: !user.isEnabled
      });

      // Update state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isEnabled: !u.isEnabled } : u
      ));

      setNotification({
        open: true,
        message: `${user.displayName || user.email} is now ${!user.isEnabled ? 'enabled' : 'disabled'}`,
        severity: "success"
      });
    } catch (err) {
      console.error("Error toggling enabled status:", err);
      setNotification({
        open: true,
        message: "Failed to update user status. Please try again.",
        severity: "error"
      });
    }
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (!userIsAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Manage Users and Permissions
          </Typography>
          
          {users.length === 0 ? (
            <Alert severity="info">No users found in the system.</Alert>
          ) : (
            <List>
              {users.map((user) => (
                <ListItem 
                  key={user.id} 
                  divider
                  sx={{ 
                    backgroundColor: user.isEnabled ? 'inherit' : 'rgba(0, 0, 0, 0.04)',
                    opacity: user.isEnabled ? 1 : 0.7
                  }}
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {user.displayName}
                        {user.email === currentUser.email && (
                          <Tooltip title="This is you">
                            <Typography variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                              (You)
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={user.email} 
                  />
                  <ListItemSecondaryAction sx={{ display: 'flex', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user.isAdmin} 
                          onChange={() => handleToggleAdmin(user)}
                          color="primary"
                          disabled={user.email === currentUser.email} // Can't remove own admin rights
                        />
                      }
                      label={
                        <Tooltip title={user.isAdmin ? "Remove admin privileges" : "Grant admin privileges"}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Admin
                          </Box>
                        </Tooltip>
                      }
                      labelPlacement="start"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user.isEnabled} 
                          onChange={() => handleToggleEnabled(user)}
                          color="secondary"
                          disabled={user.email === currentUser.email} // Can't disable own account
                        />
                      }
                      label={
                        <Tooltip title={user.isEnabled ? "Disable user account" : "Enable user account"}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {user.isEnabled ? (
                              <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                            ) : (
                              <PersonOffIcon fontSize="small" sx={{ mr: 0.5 }} />
                            )}
                            {user.isEnabled ? "Enabled" : "Disabled"}
                          </Box>
                        </Tooltip>
                      }
                      labelPlacement="start"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management Help
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>Admin Access:</strong> Users with admin access can manage other users and access special features.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>Disable User:</strong> Disabled users cannot log in to the application.
        </Typography>
        <Typography variant="body1">
          <strong>Note:</strong> You cannot remove your own admin access or disable your own account.
        </Typography>
      </Paper>
      
      {error && error.includes("permission") && (
        <Paper sx={{ p: 3, bgcolor: 'error.light' }}>
          <Typography variant="h6" gutterBottom color="error">
            Permission Error
          </Typography>
          <Typography variant="body1" paragraph>
            There was an error accessing the admin_users collection. This is likely because the Firebase security rules need to be updated.
          </Typography>
          <Typography variant="body1">
            To fix this issue:
          </Typography>
          <ol>
            <li>Run the <strong>deploy-firestore-rules.bat</strong> file in your project root</li>
            <li>Or manually deploy using: <code>firebase deploy --only firestore:rules</code></li>
            <li>After deployment, refresh this page</li>
          </ol>
          
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            You can visit <RouterLink to="/admin/initialize">Initialize Admin Collection</RouterLink> for more information.
          </Typography>
        </Paper>
      )}
      
      {/* Notification snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminManagement;