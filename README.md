# Macro Tracker & Planner

A React.js application for tracking daily food macronutrients (proteins, carbs, fats) and calories, with Firebase backend integration.

## Features

- Food Master Database: Create and manage your food items with their nutritional information
- Daily Food Log: Record your daily food consumption and track macros
- Reports: View nutrition summaries and track your progress
- Mobile-responsive design: Optimized for both desktop and mobile devices
- Admin Dashboard: Manage users, including enabling/disabling accounts and granting admin privileges
- Security: Role-based access controls with Firebase security rules

## Tech Stack

- Frontend: React.js with functional components and hooks
- UI Library: Material UI for responsive design components
- Backend & Database: Firebase with Firestore
- Routing: React Router
- Authentication: Firebase Authentication (future implementation)

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/macro-tracker-planner.git
cd macro-tracker-planner
```

2. Install dependencies
```
cd client
npm install
```

3. Create a Firebase project and setup Firestore
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Setup Firestore database
   - Register a web application and get your Firebase config

4. Create a `.env` file in the client directory with your Firebase configuration
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

5. Start the development server
```
npm start
```

## Deployment

This application is configured for Firebase Hosting deployment.

1. Install Firebase CLI
```
npm install -g firebase-tools
```

2. Login to Firebase
```
firebase login
```

3. Initialize Firebase Hosting
```
firebase init hosting
```

4. Build and deploy
```
npm run build
firebase deploy
```

## Admin Functionality

To set up the admin functionality:

1. Configure admin users in `/client/src/config/adminConfig.json`
2. Deploy Firestore rules using provided scripts:
   - Windows: Run `deploy-firestore-rules.bat`
   - Unix/Mac/Linux: Run `sh deploy-firestore-rules.sh`
3. Log in and navigate to `/admin/initialize` to initialize the admin collection
4. After initialization, access the admin dashboard at `/admin` to manage users

### Admin Features

- **User Management:** View all registered users
- **Admin Access Control:** Grant or revoke admin privileges
- **User Status:** Enable or disable user accounts
- **Security:** Firestore rules enforce access controls

## License

[MIT](LICENSE)

## Acknowledgements

- [Material UI](https://mui.com/)
- [Firebase](https://firebase.google.com/)
- [React Router](https://reactrouter.com/)