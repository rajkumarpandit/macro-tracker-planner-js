import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Paper
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from './AuthContext';
import { appColors } from '../../theme';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());

  const validateForm = () => {
    let valid = true;
    if (!email) { setEmailError('Email is required'); valid = false; }
    else if (!validateEmail(email)) { setEmailError('Please enter a valid email address'); valid = false; }
    else setEmailError('');
    if (!password) { setPasswordError('Password is required'); valid = false; }
    else setPasswordError('');
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in. Please check your credentials.');
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
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: appColors.bgPage,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {/* Brand header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
            mb: 1.5,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem' }}>M</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: appColors.textPrimary, mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ color: appColors.textSecondary }}>
            Sign in to your account to continue
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '0.85rem' }}>
              {error}
            </Alert>
          )}

          {/* Google */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 1.1, mb: 2.5, borderRadius: 2,
              textTransform: 'none', fontSize: '0.9rem', fontWeight: 500,
              borderColor: appColors.border, color: appColors.textPrimary,
              bgcolor: '#fff',
              '&:hover': { borderColor: '#4285F4', bgcolor: '#FAFBFF' },
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: appColors.textDisabled, px: 1 }}>
              or sign in with email
            </Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: appColors.textSecondary, display: 'block', mb: 0.5 }}>
              Email
            </Typography>
            <TextField
              fullWidth
              id="email"
              placeholder="you@example.com"
              name="email"
              autoComplete="email"
              autoFocus
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: appColors.textSecondary }}>
                Password
              </Typography>
              <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: appColors.blue, fontWeight: 500 }}>
                Forgot password?
              </Link>
            </Box>
            <TextField
              fullWidth
              name="password"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.2, mb: 1.5, borderRadius: 2,
                textTransform: 'none', fontSize: '0.95rem', fontWeight: 600,
                background: `linear-gradient(135deg, ${appColors.blue} 0%, ${appColors.navyDark} 100%)`,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                '&:hover': {
                  background: `linear-gradient(135deg, ${appColors.blueDark} 0%, ${appColors.navy} 100%)`,
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
                },
                '&:disabled': { background: appColors.border, boxShadow: 'none' },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Sign In'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              component={Link}
              to="/"
              disabled={loading}
              sx={{
                py: 1.1, borderRadius: 2,
                textTransform: 'none', fontSize: '0.9rem', fontWeight: 500,
                borderColor: appColors.border, color: appColors.textSecondary,
                '&:hover': { borderColor: appColors.borderDark, bgcolor: appColors.bgPage },
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Typography variant="body2" sx={{ color: appColors.textSecondary }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: appColors.blue, fontWeight: 600 }}>
              Sign up for free
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;
