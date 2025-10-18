import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Box, 
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { auth } from '../../firebase/firebase';

function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('Checking...');
  
  // Form validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pinError, setPinError] = useState('');
  
  const { signup } = useAuth();
  
  // Check Firebase Auth status when component mounts
  useEffect(() => {
    const checkAuthStatus = () => {
      if (auth) {
        console.log("Firebase Auth object exists");
        setAuthStatus("Firebase Auth is initialized");
      } else {
        console.error("Firebase Auth is null or undefined");
        setAuthStatus("Firebase Auth is NOT initialized");
        setError("Firebase authentication is not available. Please try again later.");
      }
    };
    
    checkAuthStatus();
  }, []);

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  const validatePin = (pin) => {
    // Check if PIN is exactly 6 digits
    const re = /^[0-9]{6}$/;
    return re.test(pin);
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!displayName.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate email
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validate PIN
    if (!pin) {
      setPinError('PIN is required');
      isValid = false;
    } else if (!validatePin(pin)) {
      setPinError('PIN must be exactly 6 digits');
      isValid = false;
    } else {
      setPinError('');
    }
    
    // Additional check to ensure PIN is at least 6 characters (Firebase requirement)
    if (pin.length < 6) {
      setPinError('PIN must be at least 6 characters for security');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccess('');
    
    // Validate form inputs
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      await signup(email, pin, displayName);
      setSuccess('User account created successfully! You can now log in.');
      
      // Clear form after successful signup
      setDisplayName('');
      setEmail('');
      setPin('');
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase auth errors with user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or login.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Your PIN is too weak. Please use a stronger PIN.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/configuration-not-found') {
        setError('Authentication configuration issue. Please contact support.');
      } else {
        setError(error.message || 'Failed to create an account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPin(value.slice(0, 6)); // Limit to 6 digits
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" align="center" gutterBottom>
            Create Account
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          {/* Display Firebase Authentication status (for debugging) */}
          <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mb: 2 }}>
            {authStatus}
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label="Full Name"
              name="displayName"
              autoComplete="name"
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={!!nameError}
              helperText={nameError}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="pin"
              label="6-Digit PIN"
              id="pin"
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={handlePinChange}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              error={!!pinError}
              helperText={pinError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle pin visibility"
                      onClick={() => setShowPin(!showPin)}
                      edge="end"
                    >
                      {showPin ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, mb: 2 }}>
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : "Sign Up"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                component={Link}
                to="/"
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account? <Link to="/login">Log In</Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Signup;