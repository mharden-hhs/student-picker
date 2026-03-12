// src/firebase.js
//
// This file initializes Firebase and exports the three things the app needs:
//   - db       → the Firestore database instance (for reading/writing class data)
//   - auth     → the Authentication instance (for sign-in/sign-out)
//   - provider → the Google sign-in provider (tells Firebase to use Google accounts)
//
// HOW TO FILL THIS IN:
//   1. Go to console.firebase.google.com
//   2. Open your project → Project Settings (gear icon) → Your apps
//   3. Under "SDK setup and configuration", select "Config"
//   4. Copy the firebaseConfig object and paste it below, replacing the placeholder values

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ─── Paste your Firebase config here ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
// ────────────────────────────────────────────────────────────────────────────
//
// The values above are read from your .env file so they are never exposed
// in your source code or Git history. Your .env file should look like this:
//
//   VITE_FIREBASE_API_KEY=AIzaSy...
//   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
//   VITE_FIREBASE_PROJECT_ID=your-app
//   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
//   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
//   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
//
// On Netlify, add these same key/value pairs under:
//   Site settings → Environment variables
// Netlify injects them at build time so the deployed app works the same way.

const app = initializeApp(firebaseConfig);

export const db       = getFirestore(app);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();