#!/bin/sh
echo "export const firebaseConfig = { apiKey: '$API_KEY', authDomain: '$AUTH_DOMAIN', databaseURL: '$DATABASE_URL', projectId: '$PROJECT_ID', storageBucket: '$STORAGE_BUCKET', messagingSenderId: '$MESSAGING_SENDER_ID' };" > src/app/firebaseConfig.ts
npm run build:netlify

