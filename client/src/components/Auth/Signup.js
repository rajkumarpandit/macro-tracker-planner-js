import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { auth } from '../../firebase/firebase';
import { checkDailySignupLimit } from '../../utils/apiLimits';
import { appColors } from '../../theme';

function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) setError('Firebase authentication is not available. Please try again later.');
  }, []);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());

  const validatePassword = (p) => {
    if (p.length < 6) return 'Password must be at least 6 characters';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) return 'Password must contain at least one special character';
    return '';
  };

  const validateForm = () => {
    let valid = true;
    if (!displayName.trim()) { setNameError('Name is required'); valid = false; } else setNameError('');
    if (!email) { setEmailError('Email is required'); valid = false; }
    else if (!validateEmail(email)) { setEmailError('Please enter a valid email address'); valid = false; }
    else setEmailError('');
    if (!password) { setPasswordError('Password is required'); valid = false; }
    else { const pv = validatePassword(password); if (pv) { setPasswordError(pv); valid = false; } else setPasswordError(''); }
    if (!confirmPassword) { setConfirmPasswordError('Please confirm your password'); valid = false; }
    else if (password !== confirmPassword) { setConfirmPasswordError('Passwords do not match'); valid = false; }
    else setConfirmPasswordError('');
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!validateForm()) return;
    try {
      setLoading(true);
      const signupCheck = await checkDailySignupLimit();
      if (!signupCheck.allowed) { setError(signupCheck.message); setLoading(false); return; }
      await signup(email, password, displayName);
      setSuccess('Account created! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') setError('This email is already registered.');
      else if (err.code === 'auth/weak-password') setError('Your password is too weak.');
      else setError(err.message || 'Failed to create account. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true); setError('');
      const signupCheck = await checkDailySignupLimit();
      if (!signupCheck.allowed) { setError(signupCheck.message); setLoading(false); return; }
      await loginWithGoogle();
      setSuccess('Signed in with Google! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('Google signup error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: appColors.bgPage,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      py: 3,
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Brand header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB 0%, #112649 100%)',
            mb: 1.5,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem' }}>M</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: appColors.textPrimary, mb: 0.5 }}>
            Create your account
          </Typography>
          <Typography variant="body2" sx={{ color: appColors.textSecondary }}>
            Start tracking your nutrition today
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '0.85rem' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontSize: '0.85rem' }}>{success}</Alert>}

          <Button
            fullWidth variant="outlined"
            startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
            onClick={handleGoogleSignup} disabled={loading}
            sx={{
              py: 1.1, mb: 2.5, borderRadius: 2,
              textTransform: 'none', fontSize: '0.9rem', fontWeight: 500,
              borderColor: appColors.border, color: appColors.textPrimary, bgcolor: '#fff',
              '&:hover': { borderColor: '#4285F4', bgcolor: '#FAFBFF' },
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: appColors.textDisabled, px: 1 }}>
              or create with email
            </Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            {[
              { label: 'Full Name', id: 'displayName', value: displayName, setter: setDisplayName, error: nameError, placeholder: 'John Doe', type: 'text', autoComplete: 'name' },
              { label: 'Email', id: 'email', value: email, setter: setEmail, error: emailError, placeholder: 'you@example.com', type: 'email', autoComplete: 'email' },
            ].map((field) => (
              <Box key={field.id} sx={{ mb: 1.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: appColors.textSecondary, display: 'block', mb: 0.5 }}>
                  {field.label}
                </Typography>
                <TextField
                  fullWidth id={field.id} name={field.id} size="small"
                  placeholder={field.placeholder} type={field.type}
                  autoComplete={field.autoComplete}
                  value={field.value} onChange={(e) => field.setter(e.target.value)}
                  error={!!field.error} helperText={field.error}
                />
              </Box>
            ))}

            <Box sx={{ mb: 1.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: appColors.textSecondary, display: 'block', mb: 0.5 }}>
                Password
              </Typography>
              <TextField
                fullWidth name="password" id="password" size="small"
                placeholder="Min 6 chars + 1 special char"
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                error={!!passwordError} helperText={passwordError}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: appColors.textSecondary, display: 'block', mb: 0.5 }}>
                Confirm Password
              </Typography>
              <TextField
                fullWidth name="confirmPassword" id="confirmPassword" size="small"
                placeholder="Repeat your password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!confirmPasswordError} helperText={confirmPasswordError}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                        {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                py: 1.2, mb: 1.5, borderRadius: 2,
                textTransform: 'none', fontSize: '0.95rem', fontWeight: 600,
                background: 'linear-gradient(135deg, #2563EB 0%, #112649 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #1B3A6B 100%)',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
                },
                '&:disabled': { background: appColors.border, boxShadow: 'none' },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Account'}
            </Button>

            <Button
              fullWidth variant="outlined" component={Link} to="/" disabled={loading}
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
            Already have an account?{' '}
            <Link to="/login" style={{ color: appColors.blue, fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Signup;
