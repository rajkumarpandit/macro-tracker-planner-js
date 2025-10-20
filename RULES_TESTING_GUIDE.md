# Firebase Security Rules Testing Guide

## Overview

This document explains how to test and update the Firebase Firestore security rules for the Macro Tracker & Planner application.

## Prerequisites

Before you can test the security rules, you need to have the following installed:

1. Node.js (version 14.x or later)
2. NPM (comes with Node.js)
3. Firebase CLI (`npm install -g firebase-tools`)

## Test Command Issue Resolution

If you're experiencing issues with `npm run test:rules`, follow these troubleshooting steps:

### Directory Issue

Make sure you run the command from the project root directory, not from the client directory:

```bash
# Correct
cd C:\Raj\MyProjects\cal_tracker_nj
npm run test:rules

# Incorrect
cd C:\Raj\MyProjects\cal_tracker_nj\client
npm run test:rules
```

### Setup Issue

If you encounter an "AggregateError" in the tests, it's likely related to the @firebase/testing package. This package is deprecated and may cause issues. Consider upgrading to @firebase/rules-unit-testing:

```bash
cd rules-test
npm uninstall @firebase/testing
npm install @firebase/rules-unit-testing
```

### Execution Policy in PowerShell

If PowerShell execution policy prevents running the script, use:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run the test command.

## Manual Testing with Firebase Emulator

For more reliable testing, consider using the Firebase Emulator directly:

1. Install the Firebase Emulator Suite:
   ```bash
   npm install -g firebase-tools
   ```

2. Start the emulator:
   ```bash
   cd C:\Raj\MyProjects\cal_tracker_nj
   firebase emulators:start --only firestore
   ```

3. Connect your application to the emulator for testing.

## Deploying Rules After Testing

Once your rules are working correctly, deploy them with:

```bash
npm run deploy:rules
```

## For Further Issues

If you continue to experience issues with the test suite, consider:

1. Running Jest directly in the rules-test directory:
   ```bash
   cd rules-test
   npx jest --verbose
   ```

2. Checking the Firebase documentation for updated testing approaches:
   [Firebase Rules Testing Documentation](https://firebase.google.com/docs/rules/unit-tests)