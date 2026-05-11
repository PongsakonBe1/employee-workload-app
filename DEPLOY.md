# labboy Workload Recorder - Deployment Guide

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore enabled
- Git repository (GitHub/GitLab)

## Git Branch Strategy

- `main` - Production branch (stable release)
- `develop` - Development branch (staging/testing)

## Production Release Deployment (First Time)

### Step 0: Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] All console errors fixed
- [ ] Environment variables configured
- [ ] Firebase project created
- [ ] Git commits pushed to `develop`

### Step 1: Merge develop → main

```bash
# Ensure all changes are committed to develop
git checkout develop
git add .
git commit -m "feat: ready for production release v1.0.0"
git push origin develop

# Switch to main and merge
git checkout main
git merge develop
git push origin main
```

### Step 2: Tag Release Version

```bash
# Create version tag
git tag -a v1.0.0 -m "Production release v1.0.0 - First stable release"
git push origin v1.0.0
```

## Step 3: Setup Firebase

```bash
cd firebase
npm install
firebase login
firebase use --add  # Select your Firebase project
```

## Step 4: Deploy Firestore Rules and Indexes

```bash
cd firebase
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Step 5: Import Users (if needed)

```bash
cd firebase/seed-data
node import-users.js
```

## Step 6: Import Worklogs from CSV

```bash
cd firebase/seed-data
node import-csv-worklogs.js "path/to/แบบบันทึกปริมาณงานช่างเทคนิค - Main_2026_05_11.csv"
```

## Step 7: Choose Hosting Provider

### Option A: Firebase Hosting (Recommended)

```bash
cd frontend
npm install
npm run build
firebase deploy --only hosting
```

**Pros:**

- Free SSL certificate
- Easy to deploy
- Integrated with Firebase
- Automatic CDN

**Cons:**

- Limited to Firebase ecosystem

### Option B: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
cd frontend
vercel --prod
```

**Pros:**

- Optimized for Next.js
- Fast global CDN
- Easy preview deployments

**Cons:**

- May need additional configuration for Firebase

### Option C: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
cd frontend
netlify deploy --prod
```

**Pros:**

- Free SSL
- Form handling
- Branch previews

**Cons:**

- May need redirects configuration for Next.js

## Step 8: Post-Deployment Verification

- [ ] Test all features on production URL
- [ ] Verify Firebase Auth working
- [ ] Check Firestore data loading
- [ ] Test on mobile devices
- [ ] Verify SSL certificate

## Environment Variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Logo

Replace `frontend/public/icit-logo.png` with your labboy logo (ขนาดแนะนำ 200x100px)

## Notes

- Make sure to create Firestore indexes if you see index errors
- First admin user needs to be manually set in Firestore (role: "superadmin")
- All other users can sign up with Google and be approved by admin
