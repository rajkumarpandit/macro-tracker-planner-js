# Admin Management System

This document explains how the admin management system works in the Macro Tracker application.

## Overview

The admin system allows certain users to have special privileges:
- Access to the Food Master database management
- Ability to add/remove other admin users
- View all food items across all users

## How It Works

1. Admins are stored in Firestore in the `admin_users` collection
2. Each admin is stored with their email address as the document ID
3. Admin privileges are checked using the `useIsAdmin` hook

## Adding the First Admin

To set up the initial admin:

1. Make sure your Firebase project is properly configured
2. Run the setup script:

```
cd client
node -r esm src/scripts/setupAdmin.js
```

This will add the default admin (rajkumarpandit@gmail.com) to the database.

## Managing Admins

Once the initial admin is set up, you can manage admins through the application:

1. Log in as an admin user
2. Click on the "Admin" button in the bottom navigation
3. Use the admin management interface to add or remove admin users

## Security

- Admin checks are performed both on the client and in security rules
- Only admins can access the admin management interface
- Admin users can't remove themselves from the admin list

## Troubleshooting

If you have issues with admin access:

1. Verify the user's email address in Firebase Authentication
2. Check the `admin_users` collection in Firestore
3. Make sure you're running the latest version of the application
4. Try logging out and back in to refresh auth tokens