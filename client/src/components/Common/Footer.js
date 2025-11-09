import React from 'react';
import { Box, Typography } from '@mui/material';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
        width: '100%'
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {currentYear} Raj Kumar Pandit. All rights reserved.
      </Typography>
    </Box>
  );
}

export default Footer;
