import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock-domain',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock-bucket',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'mock-app-id',
}

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)

// Connect to Emulators if configured
if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
  // Parsing host and port not strictly necessary if we pass the URL string to some SDKs,
  // but connectAuthEmulator usually takes url.
  // The env var is likely "auth.music-note-ai.firebase.localhost" (no protocol/port implied directly always, or full url?)
  // Docker compose had: "auth.${APP_NAME}.firebase.localhost"
  // connectAuthEmulator expects "http://host:port"
  // We need to construct it. The traefik setup exposes it on port 80?
  // docker-compose says:
  // traefik ports: '80:80'
  // traefik router rule: Host(`auth.${APP_NAME}.firebase.localhost`)
  // So it's http://auth.${APP_NAME}.firebase.localhost:80

  const authUrl = `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`
  connectAuthEmulator(auth, authUrl, { disableWarnings: true })
}

if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
  // Firestore emulator connection
  // connectFirestoreEmulator(db, host, port)
  // We have "firestore.${APP_NAME}.firebase.localhost"
  // Traefik exposes it on port 80 as well via correct Host header.
  // However, the JS SDK connectFirestoreEmulator takes (host, port).
  // So we split it.
  const host = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST
  connectFirestoreEmulator(db, host, 80)
}

export { app, auth, db }
