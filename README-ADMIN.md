# Calorie Tracker Admin System

This document provides a brief overview of the admin system in the Calorie Tracker application.

## Admin System Overview

The application uses a simple JSON-based admin system that allows designated users to access administrative features such as the Food Master database.

### How It Works

1. Admin users are defined in a JSON configuration file
2. When a user logs in, their email is checked against this list
3. If they are an admin, they get access to admin-only features
4. Firestore security rules enforce admin permissions server-side

## Managing Admin Users

Admin users are defined in:
```
client/src/config/adminConfig.json
```

This file contains a simple array of admin email addresses:
```json
{
  "adminUsers": [
    "rajkumarpandit@gmail.com",
    "admin@example.com"
  ]
}
```

### Adding or Removing Admins

To add or remove admin users:

1. Edit the `adminConfig.json` file
2. Add or remove email addresses from the `adminUsers` array
3. Save the file and redeploy your application

## Admin Features

Admin users have access to:

1. Food Master database management
2. Admin management view (read-only in current implementation)
3. Other admin-specific features

## Security

Even though admin status is checked client-side, the application uses Firebase security rules to enforce admin-only operations server-side.

These rules are defined in `firestore.rules` and check the user's email against a hardcoded list of admin emails that must match the configuration in `adminConfig.json`.

## For More Details

See `SIMPLE_ADMIN_GUIDE.md` for more comprehensive documentation on the admin system.