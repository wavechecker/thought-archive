# 🗂️ Weekly Ops Checklist — PatientGuide.io

Keep site performance, caching, and error rates in check. ~60 seconds each week.

---

## 1. Error Rate (Cloudflare → Analytics → Errors)
- Look at **4xx%** and **5xx%** over last 7 days.  
- ✅ <5% = healthy.  
- ⚠️ >10% → check function logs & `_redirects`.  
- 🔴 >20% → investigate broken internal links or build issues.

---

## 2. Cache-Hit Ratio (Cloudflare → Analytics → Cache)
- Goal: **50–70%+** (HTML + assets).  
- If <30%, confirm cache rules.  
- Assets should mostly HIT after warm-up.  
- HTML should HIT on repeat visits.

---

## 3. Top 404s (Netlify → Functions → pg404-log → Logs)
- Ignore: `/wp-login.php`, `/xmlrpc.php`, `phpmyadmin/*`.  
- Fix: typos in real guide/post URLs (add `_redirects`).  
- Opportunity: repeated probes (e.g. `/guides/flu`) may justify new guides.

---

## 4. Top Referrers (Cloudflare → Analytics → Traffic)
- ✅ Google, Medium, Twitter, LinkedIn = positive signals.  
- ⚠️ Spammy referrers → ignore.  
- Helps decide where to cross-post.

---

## 5. Sanity Click (Browser Test)
- Load homepage and one guide.  
- ✅ Pages <1s TTFB (cache HIT).  
- Check favicon/logo.  
- Test redirect: `/guides/heart` → `/guides/heart-circulation/`.

---

## 🚦 Decision Tree
- High error rate + real URLs → fix with `_redirects`.  
- Low cache-hit → recheck Cloudflare cache rules.  
- Weird 404s only → ignore.  
- Good referrers → expand content there.

---

⏱️ Done in under 5 minutes.
