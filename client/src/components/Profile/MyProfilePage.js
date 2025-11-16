import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Grid,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../Auth/AuthContext';
import { updatePassword } from 'firebase/auth';
import { FIREBASE_COLLECTIONS } from '../../config/constants';
import Footer from '../Common/Footer';

function MyProfilePage() {
  const { currentUser, userDetails } = useAuth();
  const navigate = useNavigate();
  
  // Profile fields
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  
  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Load user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, currentUser.uid));
        let userName = '';
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          userName = data.name || '';
          setSex(data.sex || '');
          setDateOfBirth(data.dateOfBirth || '');
          setHeightFeet(data.heightFeet || '');
          setHeightInches(data.heightInches || '');
          setWeightKg(data.weightKg || '');
        }
        
        // If name is not in Firestore, try to get it from Auth
        if (!userName) {
          if (userDetails?.displayName) {
            userName = userDetails.displayName;
          } else if (currentUser?.displayName) {
            userName = currentUser.displayName;
          } else if (currentUser?.email) {
            // Fall back to email username as last resort
            const emailName = currentUser.email.split('@')[0];
            userName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          }
        }
        
        setName(userName);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ text: 'Error loading profile', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, userDetails]);

  // Calculate age from date of birth
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      setAge(calculatedAge > 0 ? `${calculatedAge} years` : '');
    } else {
      setAge('');
    }
  }, [dateOfBirth]);

  // Calculate height in cm
  useEffect(() => {
    if (heightFeet || heightInches) {
      const feet = parseFloat(heightFeet) || 0;
      const inches = parseFloat(heightInches) || 0;
      const totalInches = (feet * 12) + inches;
      const cm = (totalInches * 2.54).toFixed(1);
      setHeightCm(totalInches > 0 ? cm : '');
    } else {
      setHeightCm('');
    }
  }, [heightFeet, heightInches]);

  // Calculate weight in lbs
  useEffect(() => {
    if (weightKg) {
      const kg = parseFloat(weightKg);
      if (kg > 0) {
        const lbs = (kg * 2.20462).toFixed(1);
        setWeightLbs(lbs);
      } else {
        setWeightLbs('');
      }
    } else {
      setWeightLbs('');
    }
  }, [weightKg]);

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      setMessage({ text: 'Name is required', type: 'error' });
      return;
    }

    // Validate height values if provided
    if (heightFeet) {
      const feet = parseFloat(heightFeet);
      if (feet < 0 || feet > 8) {
        setMessage({ text: 'Height (feet) must be between 0 and 8', type: 'error' });
        return;
      }
    }

    if (heightInches) {
      const inches = parseFloat(heightInches);
      if (inches < 0 || inches >= 12) {
        setMessage({ text: 'Height (inches) must be between 0 and 11', type: 'error' });
        return;
      }
    }

    // Validate weight value if provided
    if (weightKg) {
      const weight = parseFloat(weightKg);
      if (weight < 0 || weight > 150) {
        setMessage({ text: 'Weight must be between 0 and 150 kg', type: 'error' });
        return;
      }
    }

    // Validate password fields if entered
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setMessage({ text: 'Passwords do not match', type: 'error' });
        return;
      }
      if (newPassword.length < 6) {
        setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
        return;
      }
    }

    setSaving(true);
    try {
      // Update profile in Firestore
      const profileData = {
        name: name.trim(),
        sex: sex,
        dateOfBirth: dateOfBirth,
        heightFeet: heightFeet,
        heightInches: heightInches,
        weightKg: weightKg,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, FIREBASE_COLLECTIONS.USERS, currentUser.uid), profileData);

      // Update password if provided
      if (newPassword) {
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ text: 'Profile and password updated successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ text: 'Please log out and log in again to change your password', type: 'error' });
      } else {
        setMessage({ text: 'Error updating profile: ' + error.message, type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#667eea' }} />
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
          gap: 1.5,
          position: 'relative'
        }}>
          <PersonIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />
          <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            My Profile
          </Typography>
          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{ position: 'absolute', right: { xs: 8, sm: 16 }, color: 'white' }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

        <Grid container spacing={3}>
          {/* Name - Required */}
          <Grid item xs={12}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              error={!name.trim()}
              helperText={!name.trim() ? 'Name is required' : ''}
            />
          </Grid>

          {/* Sex - Optional */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, color: '#667eea', fontWeight: 500 }}>Sex (Optional)</FormLabel>
              <RadioGroup
                row
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.85rem', sm: '0.95rem' }
                  },
                  '& .MuiRadio-root.Mui-checked': {
                    color: '#667eea'
                  }
                }}
              >
                <FormControlLabel value="male" control={<Radio />} label="Male" />
                <FormControlLabel value="female" control={<Radio />} label="Female" />
                <FormControlLabel value="others" control={<Radio />} label="Others" />
                <FormControlLabel value="prefer-not-to-say" control={<Radio />} label="Don't want to say" />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Date of Birth - Optional */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date of Birth (Optional)"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                }
              }}
            />
          </Grid>

          {/* Age - Read Only */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Age"
              value={age}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5
                }
              }}
            />
          </Grid>

          {/* Height in Feet & Inches - Optional */}
          <Grid item xs={6} sm={3}>
            <TextField
              label="Height(ft)"
              type="number"
              value={heightFeet}
              onChange={(e) => setHeightFeet(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0, max: 8, step: 1 }}
              helperText="Max: 8 ft"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              label="Height(inch)"
              type="number"
              value={heightInches}
              onChange={(e) => setHeightInches(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0, max: 11, step: 0.1 }}
              helperText="Max: 11 in"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>

          {/* Height in CM - Read Only */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Height (cm)"
              value={heightCm}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5
                }
              }}
            />
          </Grid>

          {/* Weight in KG */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Weight (kg) (Optional)"
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0, max: 150, step: 0.1 }}
              helperText="Max: 150 kg"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>

          {/* Weight in LBS - Read Only */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Weight (lbs)"
              value={weightLbs}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5
                }
              }}
            />
          </Grid>

          {/* Change Password Section */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="600" color="#667eea" sx={{ mt: 1.5, mb: 0.5, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
              Change Password
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                      size="small"
                    >
                      {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              helperText="Leave blank to keep current password"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={newPassword !== confirmPassword && confirmPassword !== ''}
              helperText={
                newPassword !== confirmPassword && confirmPassword !== ''
                  ? 'Passwords do not match'
                  : ''
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': { borderColor: '#667eea' },
                  '&.Mui-focused fieldset': { borderColor: '#667eea' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
              <Button
                onClick={handleCancel}
                variant="outlined"
                disabled={saving}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  borderColor: '#9e9e9e',
                  color: '#616161',
                  '&:hover': {
                    borderColor: '#757575',
                    bgcolor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={saving || !name.trim()}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #633d8a 100%)',
                  },
                  '&:disabled': {
                    background: '#e0e0e0'
                  }
                }}
              >
                {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      </Box>

      {/* Snackbar for messages */}
      <Snackbar
        open={message.text !== ''}
        autoHideDuration={6000}
        onClose={() => setMessage({ text: '', type: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ text: '', type: '' })}
          severity={message.type}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
      
      <Footer />
    </Box>
  );
}

export default MyProfilePage;
