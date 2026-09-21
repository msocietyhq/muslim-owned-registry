"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

declare global {
  var __MUSLIMOWNED_EMULATORS__: boolean | undefined;
}

export function getFirebaseClient() {
  if (!getApps().length) {
    app = initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-muslimowned-sg",
      storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "demo-muslimowned-sg.appspot.com",
      messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo",
    });
  } else {
    app = getApps()[0]!;
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "1" &&
    typeof window !== "undefined" &&
    !globalThis.__MUSLIMOWNED_EMULATORS__
  ) {
    globalThis.__MUSLIMOWNED_EMULATORS__ = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8088);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }

  return { app, auth, db, storage };
}
