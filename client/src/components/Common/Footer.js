import React from 'react';
import { Box, Typography } from '@mui/material';
import { APP_INFO } from '../../config/constants';
import { appColors } from '../../theme';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        backgroundColor: appColors.bgCard,
        borderTop: `1px solid ${appColors.border}`,
        textAlign: 'center',
        width: '100%',
      }}
    >
      <Typography variant="caption" sx={{ color: appColors.textDisabled, fontSize: '0.75rem' }}>
        © {currentYear} {APP_INFO.AUTHOR} • All rights reserved
      </Typography>
    </Box>
  );
}

export default Footer;
