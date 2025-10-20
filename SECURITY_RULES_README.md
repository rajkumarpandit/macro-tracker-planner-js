# Macro Tracker & Planner

A React application for tracking and planning nutritional macros (proteins, carbs, fats) with multi-user support.

## Firebase Security Rules

This application now includes Firebase Security Rules for protecting user data and enforcing proper access control.

### Understanding the Security Rules

The security rules (`firestore.rules`) implement the following access controls:

1. **Daily Food Log:**
   - Users can only read, create, update, and delete their own entries
   - All entries require a valid userId that matches the authenticated user
   - Update operations preserve the userId field (cannot be changed)

2. **Food Calorie Master:**
   - All authenticated users can read all food items
   - Users can only create food items linked to their userId
   - Users can only update or delete food items they created
   - Update operations preserve the userId field (cannot be changed)

3. **User Profiles:**
   - Users can only read and update their own profiles
   - User deletion is prohibited (data preservation)

4. **User Goals:**
   - Users can only read, create, update, and delete their own goal entries
   - All operations verify the userId matches the authenticated user

5. **Macro Targets:**
   - Users can only read, create, update, and delete their own macro targets
   - All operations verify the userId matches the authenticated user

6. **Admin Collection:**
   - Restricted to users with admin privileges
   - Access controlled via custom claims or admin flag in user document

The rules also incorporate helper functions for improved readability and consistent validation:

### Deploying Security Rules

#### Option 1: Manual Deployment

To deploy the security rules manually:

```bash
# Make sure you're logged in to Firebase
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules
```

#### Option 2: Using the Setup Script

We've provided a utility script to help manage security rules:

```bash
# Run the setup script
node securityRulesSetup.js
```

This script offers options to:
1. Deploy Firestore security rules
2. Test rules with the Firebase emulator
3. Exit the utility

#### Automatic Deployment via GitHub Actions

The GitHub workflow has been updated to automatically deploy security rules when changes are pushed to the main branch.

**Note:** You need to add the `FIREBASE_TOKEN` secret to your GitHub repository to enable automatic rule deployment. Generate a token using `firebase login:ci` and add it to your GitHub repository secrets.

### Testing Security Rules

To test if the security rules are working correctly:

1. Run the indexTester.js script to verify query access:
   ```bash
   node indexTester.js
   ```

2. Use the Firebase emulator to test rules locally:
   ```bash
   firebase emulators:start --only firestore
   ```

### Rule Modifications

If you need to modify the security rules:

1. Edit the `firestore.rules` file
2. Test the changes locally with the Firebase emulator
3. Deploy using one of the methods above

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Testing Security Rules](https://firebase.google.com/docs/firestore/security/test-rules)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)