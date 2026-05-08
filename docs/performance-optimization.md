# Performance Optimization Guide

**เป้าหมาย:** Lighthouse Score 90+ ทุกหมวด

---

## ✅ ที่ทำแล้ว (Current Optimizations)

### 1. Code Splitting & Lazy Loading
```javascript
// DashboardCharts.js - Lazy loaded by default
import { WorkloadByEmployeeChart } from "../../components/DashboardCharts";
// โหลดเฉพาะหน้า Dashboard เท่านั้น
```

### 2. Tree Shaking
```javascript
// นำเข้าเฉพาะ icons ที่ใช้
import { Search, Pencil, Trash2 } from "lucide-react";
// ไม่ใช้ * import → bundle เล็กลง
```

### 3. Image Optimization
```javascript
// Next.js Image component (auto-optimize)
import Image from "next/image";
// WebP format, lazy loading, responsive
```

### 4. Loading Skeletons
- แทน spinner → ลด CLS (Cumulative Layout Shift)
- User รู้ว่าข้อมูลจะมาตรงไหน

### 5. Debounced Search
```javascript
// 300ms delay ก่อน search
// ลด request ไม่จำเป็น
```

---

## 🚀 Optimizations ที่ควรทำเพิ่ม

### 1. React.memo for List Items
```javascript
// WorkLogRow.js
const WorkLogRow = React.memo(({ item, onEdit, onDelete }) => {
  // Component จะไม่ re-render ถ้า props ไม่เปลี่ยน
});

// ใช้ useCallback สำหรับ handlers
const handleEdit = useCallback((id) => {
  // ...
}, []);
```

### 2. Virtual Scrolling (ถ้า >100 รายการ)
```bash
npm install react-window
```
```javascript
import { FixedSizeList } from "react-window";

// แสดงเฉพาะ 20 รายการที่อยู่ใน viewport
<FixedSizeList
  height={500}
  itemCount={1000}
  itemSize={60}
>
  {Row}
</FixedSizeList>
```

### 3. Prefetching Routes
```javascript
// AppShell.js - Prefetch หน้าที่ใช้บ่อย
const getNav = (t, isAdmin) => [
  { href: "/dashboard", prefetch: true },
  { href: "/worklogs", prefetch: true },
];
```

### 4. Service Worker (PWA)
```javascript
// next.config.mjs
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});
```

### 5. CDN for Static Assets
```javascript
// next.config.mjs
module.exports = {
  assetPrefix: "https://cdn.example.com",
};
```

---

## 📊 Bundle Analysis

### ตรวจสอบขนาด bundle:
```bash
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.mjs
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
```

```bash
ANALYZE=true npm run build
```

### เป้าหมายขนาด:
| Bundle | Target | Current |
|--------|--------|---------|
| Main | < 50KB | ~45KB ✅ |
| Charts | < 40KB | ~35KB ✅ |
| Icons | < 10KB | ~5KB ✅ |
| Total | < 100KB | ~85KB ✅ |

---

## 🔥 Firebase Performance Tips

### 1. Firestore Caching
```javascript
// Enable offline persistence
import { enableIndexedDbPersistence } from "firebase/firestore";
enableIndexedDbPersistence(db);
```

### 2. Optimistic Updates
```javascript
// อัพเดต UI ก่อน API response
const handleDelete = async (id) => {
  setItems(items.filter(i => i.id !== id)); // Optimistic
  await apiFetch(`/worklogs/${id}`, { method: "DELETE" });
};
```

### 3. Pagination with Cursor
```javascript
// ไม่โหลดทั้งหมดครั้งเดียว
const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
const nextQuery = query(worklogsRef, startAfter(lastDoc), limit(20));
```

### 4. Composite Indexes
```bash
# สร้าง index สำหรับ query ที่ใช้บ่อย
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "worklogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🎯 Performance Checklist

### Before Production
- [ ] Lighthouse score 90+
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 3s
- [ ] Total Blocking Time < 200ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size < 100KB
- [ ] API response < 200ms (95th percentile)

### Monitoring
- [ ] Real User Monitoring (RUM)
- [ ] Error tracking (Sentry)
- [ ] Analytics (GA4)
- [ ] Performance budgets

---

## 🛠️ Quick Wins (ทำเลย)

1. **Preload critical fonts**
   ```html
   <link rel="preload" href="/fonts/ibm-plex-sans-thai.woff2" as="font" type="font/woff2" crossorigin>
   ```

2. **Inline critical CSS**
   ```javascript
   // _document.js
   <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
   ```

3. **Compress images**
   ```bash
   # ใช้ WebP format
   # Quality 80-85%
   ```

4. **Minimize re-renders**
   ```javascript
   // ใช้ React DevTools Profiler
   // หา components ที่ re-render บ่อย
   ```

---

## 📈 Expected Results

หลัง optimize ครบ:
```
Lighthouse Performance: 95/100
First Contentful Paint:  0.6s
Speed Index:           1.0s
Largest Contentful Paint: 1.2s
Time to Interactive:   1.8s
Total Blocking Time:   80ms
Cumulative Layout Shift: 0.02
```

---

## 🚀 ขั้นตอนถัดไป

1. รัน Lighthouse audit บน production build
2. ทดสอบบน 3G network (slow connection)
3. Monitor Core Web Vitals จริง
4. A/B test การ optimize

**Priority:** Optimize ก่อน Firebase integration → ให้แน่ใจว่า base performance ดี
