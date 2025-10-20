# Firebase CI/CD Setup Guide

This document explains how to set up the GitHub Actions workflow for automatic deployment of the application and security rules.

## Generate a Firebase Token

To enable GitHub Actions to deploy your Firebase application and security rules, you need to generate a Firebase token:

1. Open a terminal
2. Make sure you're logged into Firebase CLI: `firebase login`
3. Generate a CI token: `firebase login:ci`
4. Copy the token that is generated

## Add the Token to GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" > "Actions"
4. Click "New repository secret"
5. Name: `FIREBASE_TOKEN`
6. Value: Paste the token you copied earlier
7. Click "Add secret"

## Verify the Workflow File

The GitHub workflow file (`.github/workflows/firebase-hosting-merge.yml`) should be configured to use this token for deployment. The relevant part looks like:

```yml
- name: Deploy Firestore Rules
  run: firebase deploy --only firestore:rules --project macro-tracker-and-planner --token "${{ secrets.FIREBASE_TOKEN }}"
```

## Testing the Workflow

To test if the workflow is correctly set up:

1. Make a change to any file in your repository
2. Commit and push to the main branch
3. Go to the "Actions" tab in your GitHub repository
4. You should see a workflow running that includes deploying the security rules

## Troubleshooting

If the deployment fails, check:

1. The Firebase token is correctly set up in GitHub Secrets
2. The project ID in the workflow file matches your Firebase project ID
3. The token has the necessary permissions to deploy to your project