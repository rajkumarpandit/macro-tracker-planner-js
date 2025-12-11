import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  IconButton,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useAuth } from './AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  // Form validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const validateForm = () => {
    let isValid = true;
    
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
    
    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error
    setError('');
    
    // Validate form inputs
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors with user-friendly messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(error.message || 'Failed to sign in. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper 
          elevation={8} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            width: '100%',
            borderRadius: 2,
            background: 'linear-gradient(to bottom, #ffffff, #f5f7fa)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockOpenIcon 
              sx={{ 
                fontSize: 48, 
                color: '#667eea', 
                mb: 1 
              }} 
            />
            <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to continue to your account
            </Typography>
          </Box>
          
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 1.5,
              mb: 3,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              borderColor: '#4285f4',
              color: '#4285f4',
              '&:hover': {
                borderColor: '#357ae8',
                backgroundColor: 'rgba(66, 133, 244, 0.04)'
              }
            }}
          >
            Sign in with Google
          </Button>
          
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              OR
            </Typography>
          </Divider>
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  }
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  }
                }
              }}
            />
            
            <Box sx={{ textAlign: 'right', mt: 1, mb: 2 }}>
              <Link 
                to="/forgot-password" 
                style={{ 
                  color: '#667eea', 
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Forgot Password?
              </Link>
            </Box>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 2,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
                '&:disabled': {
                  background: '#e0e0e0'
                }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : "Sign In"}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              component={Link}
              to="/"
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 2,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#5568d3',
                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  style={{ 
                    color: '#667eea', 
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;