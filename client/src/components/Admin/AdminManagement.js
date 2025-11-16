import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Button,
  Chip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useIsAdmin, addAdmin, removeAdmin } from '../../utils/adminUtils';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import Footer from '../Common/Footer';

const AdminManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [userChanges, setUserChanges] = useState({});
  
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

  // Handle checkbox changes
  const handleCheckboxChange = (userId, field, value) => {
    setUserChanges(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value
      }
    }));
  };

  // Function to save user changes
  const handleSaveUser = async (user) => {
    try {
      if (user.email === currentUser.email) {
        setNotification({
          open: true,
          message: "You cannot modify your own permissions!",
          severity: "error"
        });
        return;
      }

      const changes = userChanges[user.id] || {};
      const newIsAdmin = changes.hasOwnProperty('isAdmin') ? changes.isAdmin : user.isAdmin;
      const newIsEnabled = changes.hasOwnProperty('isEnabled') ? changes.isEnabled : user.isEnabled;

      // Update admin status if changed
      if (newIsAdmin !== user.isAdmin) {
        let success = false;
        if (newIsAdmin) {
          success = await addAdmin(user.email);
        } else {
          success = await removeAdmin(user.email);
        }
        if (!success) {
          throw new Error("Failed to update admin status");
        }
      }

      // Update enabled status if changed
      if (newIsEnabled !== user.isEnabled) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          isEnabled: newIsEnabled
        });
      }

      // Update state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isAdmin: newIsAdmin, isEnabled: newIsEnabled } : u
      ));

      // Clear changes for this user
      setUserChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[user.id];
        return newChanges;
      });

      setNotification({
        open: true,
        message: `Changes saved for ${user.displayName || user.email}`,
        severity: "success"
      });
    } catch (err) {
      console.error("Error saving user changes:", err);
      setNotification({
        open: true,
        message: "Failed to save changes. Please try again.",
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
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', p: { xs: 2, sm: 3 } }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 2 }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(102, 187, 106, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <SupervisorAccountIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />
          <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            User Management
          </Typography>
        </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress sx={{ color: '#667eea' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      ) : (
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, mb: 1.5 }}>
            Manage Users and Permissions
          </Typography>
          
          {users.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>No users found in the system.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {users.map((user) => {
                const changes = userChanges[user.id] || {};
                const currentIsAdmin = changes.hasOwnProperty('isAdmin') ? changes.isAdmin : user.isAdmin;
                const currentIsEnabled = changes.hasOwnProperty('isEnabled') ? changes.isEnabled : user.isEnabled;
                const hasChanges = Object.keys(changes).length > 0;
                
                return (
                  <Paper 
                    key={user.id}
                    elevation={0}
                    sx={{ 
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: hasChanges ? '#667eea' : '#e0e0e0',
                      backgroundColor: currentIsEnabled ? 'white' : 'rgba(0, 0, 0, 0.04)',
                      opacity: currentIsEnabled ? 1 : 0.7,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)'
                      }
                    }}
                  >
                    {/* User Info - One Line */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {user.displayName} - {user.email}
                        {user.email === currentUser.email && (
                          <Chip label="You" size="small" sx={{ ml: 1, bgcolor: '#667eea', color: 'white', fontSize: '0.7rem' }} />
                        )}
                      </Typography>
                    </Box>
                    
                    {/* Checkboxes - Stacked vertically on mobile */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={currentIsAdmin}
                            onChange={(e) => handleCheckboxChange(user.id, 'isAdmin', e.target.checked)}
                            disabled={user.email === currentUser.email}
                            size="small"
                            sx={{
                              color: '#667eea',
                              '&.Mui-checked': {
                                color: '#667eea'
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>Admin Role</Typography>
                          </Box>
                        }
                      />
                      
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={currentIsEnabled}
                            onChange={(e) => handleCheckboxChange(user.id, 'isEnabled', e.target.checked)}
                            disabled={user.email === currentUser.email}
                            size="small"
                            sx={{
                              color: '#4caf50',
                              '&.Mui-checked': {
                                color: '#4caf50'
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon fontSize="small" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>Account Enabled</Typography>
                          </Box>
                        }
                      />
                    </Box>
                    
                    {/* Save Button */}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSaveUser(user)}
                      disabled={!hasChanges || user.email === currentUser.email}
                      fullWidth
                      sx={{
                        textTransform: 'none',
                        borderRadius: 1.5,
                        py: 1,
                        fontSize: { xs: '0.85rem', sm: '0.95rem' },
                        fontWeight: 600,
                        background: hasChanges ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                        '&:hover': {
                          background: hasChanges ? 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)' : undefined,
                        },
                        '&:disabled': {
                          background: '#e0e0e0',
                          color: '#9e9e9e'
                        }
                      }}
                    >
                      Save Changes
                    </Button>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Paper>
      )}
      
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Typography variant="body2" fontWeight="600" color="#667eea" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, mb: 1.5 }}>
          User Management Help
        </Typography>
        <Typography variant="body2" paragraph sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, mb: 1 }}>
          <strong>Admin Access:</strong> Users with admin access can manage other users and access special features.
        </Typography>
        <Typography variant="body2" paragraph sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, mb: 1 }}>
          <strong>Disable User:</strong> Disabled users cannot log in to the application.
        </Typography>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
          <strong>Note:</strong> You cannot remove your own admin access or disable your own account.
        </Typography>
      </Paper>
      
      {error && error.includes("permission") && (
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#ffebee', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Typography variant="body2" fontWeight="600" color="error" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
            Permission Error
          </Typography>
          <Typography variant="body2" paragraph sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
            There was an error accessing the admin_users collection. This is likely because the Firebase security rules need to be updated.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, mb: 1 }}>
            To fix this issue:
          </Typography>
          <Box component="ol" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, pl: 2.5 }}>
            <li>Run the <strong>deploy-firestore-rules.bat</strong> file in your project root</li>
            <li>Or manually deploy using: <code>firebase deploy --only firestore:rules</code></li>
            <li>After deployment, refresh this page</li>
          </Box>
          
          <Typography variant="caption" sx={{ mt: 1.5, fontStyle: 'italic', display: 'block', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
            You can visit <RouterLink to="/admin/initialize" style={{ color: '#667eea' }}>Initialize Admin Collection</RouterLink> for more information.
          </Typography>
        </Paper>
      )}
      </Box>
      
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
      <Footer />
    </Box>
  );
};

export default AdminManagement;