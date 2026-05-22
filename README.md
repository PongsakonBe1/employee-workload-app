# labboy Workload Recorder

Employee workload recording system for ICIT staff with PWA support, Firebase backend, and Google Sign-In.

## Features

- **PWA Support**: Install as app on iOS/Android with offline capabilities
- **Google Sign-In**: Secure authentication with Firebase Auth
- **Role-based Access**: Admin, Superadmin, and Staff roles
- **Workload Recording**: Record and track employee work logs
- **Export Data**: CSV export with date range filtering
- **Dashboard**: Visual analytics with charts (recharts)
- **Real-time**: Firebase Firestore for live data sync

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Charts**: Recharts (lazy loaded)
- **PWA**: next-pwa with custom manifest
- **Security**: Snyk SAST scanning, sanitized inputs

## Development

```bash
# Install dependencies
cd frontend && npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npx playwright test
```

## Deployment

```bash
# Build and deploy to Firebase Hosting
npm run build
cd ../firebase && firebase deploy --only hosting
```

## Security

สแกนด้วย [Snyk](https://snyk.io) ทุก release:

- **Frontend deps**: ไม่มีช่องโหว่ (0 issues)
- **Firebase Functions deps**: พบ 3 medium issues ใน transitive deps — แก้ได้ด้วย `npm update`
- **Hosting**: Security Headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`)

## Changelog

| Version | Changes |
| ------- | ------- |
| v1.6.0 | **Login**: signInWithRedirect ทุก platform (ยกเว้น iOS standalone ใช้ popup), **Firestore rules**: staff แก้ไข worklog ได้เฉพาะวันเดียวกัน (isSameDay), **Dashboard**: recent sort DESC by date+time, custom date range filter พร้อม quota alert (>90 วัน), staff เห็นอันดับตัวเองในกลุ่ม, admin เห็น top3+ทุกคน, **Admin/Users**: superadmin แต่งตั้ง admin เป็น superadmin พร้อม confirm modal |
| v1.5.0 | **Export**: fix sort by date+time asc (น้อย→มาก), fix recipient field mapping (recipient, requesterName, client, customer, receiver, to), **Dashboard**: layout v2 (pie+minor → trend full-width with date range label → main+minor bars → workload vs staff stats), **Favicon**: black background logo |
| v1.4.0 | Fix iOS PWA ITP login (popup แทน redirect), lazy load recharts, Snyk DOM XSS fix |
| v1.3.0 | Fix favicon browser tab, Android+iOS PWA login, security headers |
| v1.2.0 | iOS Standalone PWA fix |
| v1.1.1 | Fix worklog status normalization, dashboard filter |
| v1.1.0 | Bulk import, notifications, Firestore rules |
| v1.0.0 | Initial release |

## License

MIT © ICIT Lab
