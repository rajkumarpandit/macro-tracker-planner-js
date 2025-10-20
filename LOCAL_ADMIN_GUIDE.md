# Local Admin Setup Guide

If you prefer not to upgrade to Firebase's Blaze plan for using Cloud Functions, you can use this local approach for admin setup.

## Using the Local Admin Script

The local admin script allows you to set up admin users directly from your development environment.

### Prerequisites

1. Make sure you have installed the required packages:
   ```bash
   npm install --save-dev dotenv firebase
   ```

2. Ensure you have a properly configured `.env` file in your project root with:
   ```
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ADMIN_EMAIL=your-admin-email@example.com
   ```

### Running the Admin Setup Script

1. Navigate to the client/src/scripts directory:
   ```bash
   cd client/src/scripts
   ```

2. Run the setup script:
   ```bash
   node setupAdmin.js
   ```

3. Verify the admin user was created by checking your Firebase Console > Firestore > admin_users collection.

### Managing Admin Users Without Cloud Functions

Since you're not using Cloud Functions, admin user management will need to be handled through your React application with appropriate Firestore security rules.

1. Update your Firestore security rules to protect the admin_users collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Check if the user is an admin
    function isAdmin() {
      let userEmail = request.auth.token.email;
      let adminDoc = exists(/databases/$(database)/documents/admin_users/$(userEmail));
      return adminDoc;
    }
    
    // Admin users collection - only admins can write
    match /admin_users/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Other collections as needed...
  }
}
```

2. To add a new admin, the current admin user would need to:
   - Log into the application
   - Use the admin management UI
   - This will write directly to Firestore (which is allowed by the security rules above)

### Security Considerations

Without Cloud Functions, all admin management happens client-side. This means:

1. Security depends entirely on your Firestore security rules
2. All logic is visible in the client code
3. You need to be extremely careful with admin privileges

For production applications with sensitive data, we still recommend upgrading to the Blaze plan for better security through Cloud Functions.

### Alternatives to Cloud Functions

If you prefer to avoid the Blaze plan but need server-side logic for admin management:

1. Use a custom backend server (Node.js, Express, etc.)
2. Consider Firebase Auth Custom Claims for admin roles
3. Use scheduled scripts that run locally for maintenance tasks