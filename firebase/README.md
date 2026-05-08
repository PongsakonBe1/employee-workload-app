# Firebase Setup Guide - ICIT Workload App

## 📋 Prerequisites

1. **Node.js** v20+ installed
2. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase Account** (Google account)

## 🚀 Quick Start

### 1. Login to Firebase
```bash
cd firebase
firebase login
```

### 2. Create Firebase Project
```bash
firebase projects:create icit-workload-app
# or use existing project
firebase use --add
```

### 3. Enable Services
- Go to [Firebase Console](https://console.firebase.google.com/)
- Enable **Firestore Database**
- Enable **Authentication** (Email/Password provider)
- Enable **Cloud Functions**

### 4. Install Dependencies & Deploy
```bash
cd functions
npm install
npm run build
firebase deploy
```

## 📁 Project Structure

```
firebase/
├── functions/
│   ├── src/
│   │   ├── auth/
│   │   │   └── onCreate.ts         # User creation trigger
│   │   ├── worklogs/
│   │   │   ├── onCreate.ts         # Worklog create trigger
│   │   │   ├── onUpdate.ts         # Worklog update trigger
│   │   │   └── onDelete.ts         # Worklog delete trigger
│   │   ├── audit/
│   │   │   └── onWorklogChange.ts  # Audit log queries
│   │   ├── scheduled/
│   │   │   └── lockWorklogs.ts     # 23:59 auto-lock
│   │   └── index.ts                # Main exports
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules                   # Security rules
├── firestore.indexes.json            # Database indexes
├── storage.rules                     # Storage rules
└── firebase.json                     # Firebase config
```

## 🔒 Security Rules

### Authentication
- Only `@icit.kmutnb.ac.th` emails allowed
- Users auto-created on first login
- Admin role set manually in Firestore

### Firestore Rules
- **Users**: Read by any auth user, write by admin only
- **Worklogs**: Users see/edit only their own (if not locked)
- **AuditLogs**: Admin read only
- **Categories**: Read by all, write by admin

## ⚡ Cloud Functions

### Auth Functions
| Function | Trigger | Description |
|----------|---------|-------------|
| `onUserCreated` | Auth create | Validate domain, create profile |
| `getUserProfile` | HTTP callable | Get current user data |

### Worklog Functions
| Function | Trigger | Description |
|----------|---------|-------------|
| `onWorklogCreated` | Firestore create | Validate, set lock time |
| `onWorklogUpdated` | Firestore update | Check lock, audit log |
| `onWorklogDeleted` | Firestore delete | Backup data, audit log |

### Audit Functions
| Function | Trigger | Description |
|----------|---------|-------------|
| `getAuditLogs` | HTTP callable | Query logs (admin only) |

### Scheduled Functions
| Function | Schedule | Description |
|----------|----------|-------------|
| `lockWorklogs` | 23:59 daily | Auto-lock today's records |
| `manualLockWorklog` | HTTP callable | Manual lock/unlock (admin) |

## 💾 Firestore Data Model

### Collections

#### `users/{uid}`
```typescript
{
  uid: string;
  username: string;
  email: string;
  nickname: string;
  fullName: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

#### `worklogs/{worklogId}`
```typescript
{
  id: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  recipient: string;
  dutyGroup: string;
  mainDuty: string;
  minorTask: string;
  comment: string;
  status: string;
  employeeId: string;
  employeeNickname: string;
  locked: boolean;
  lockTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### `auditLogs/{logId}`
```typescript
{
  type: "WORKLOG_CREATED" | "WORKLOG_UPDATED" | "WORKLOG_DELETED" | 
        "WORKLOGS_LOCKED" | "WORKLOG_LOCKED_MANUAL" | "WORKLOG_UNLOCKED_MANUAL" |
        "USER_CREATED";
  worklogId?: string;
  userId?: string;
  timestamp: Timestamp;
  details: object;
}
```

#### `categories/config`
```typescript
{
  dutyGroups: Array<{
    key: string;
    label: string;
    duties: string[];
  }>;
  minorTasks: string[];
  minorTasksByDuty: Record<string, string[]>;
}
```

## 🔧 Development

### Run Emulators Locally
```bash
firebase emulators:start
```
Access:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Emulator UI: http://localhost:4000

### Test Functions
```bash
# Build
npm run build

# Deploy single function
firebase deploy --only functions:onUserCreated

# View logs
firebase functions:log
```

## 📊 Monitoring

### Free Tier Limits (Spark Plan)
| Resource | Limit | Your Usage |
|----------|-------|------------|
| Function invocations | 2M/month | ~10K |
| Firestore reads | 50K/day | ~5K |
| Firestore writes | 20K/day | ~2K |
| Storage | 1GB | ~10MB |

**You are well within free limits!** ✅

## 🚨 Troubleshooting

### CORS Errors
- Check `firestore.rules` allow origins
- Ensure `credentials: true` in functions

### Functions Not Deploying
- Check `npm run build` succeeds
- Verify `lib/` folder exists
- Check Firebase CLI version: `firebase --version`

### Emulators Won't Start
- Check ports not in use: 4000, 5001, 8080, 9099
- Clear `.firebase/` folder
- Run `firebase emulators:start --debug`

## 📝 Next Steps

1. ✅ Setup Firebase project
2. ✅ Deploy security rules
3. ✅ Deploy functions
4. ⏳ Migrate data from MongoDB
5. ⏳ Update frontend to use Firebase SDK
6. ⏳ Test all features
7. ⏳ Deploy to production

## 📚 Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
