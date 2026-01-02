# 🚀 Quick Deployment Guide

## Simple 5-Step Process

### 1️⃣ Create GitHub Repository

1. Go to https://github.com/new
2. Name: `keystone-race-calculator`
3. **Don't** add README, .gitignore, or license
4. Click "Create repository"

### 2️⃣ Upload Files to GitHub

**Easy Way (Web Interface):**
1. Click "uploading an existing file"
2. Drag ALL files from this folder
3. Commit message: "Initial commit"
4. Click "Commit changes"

**Command Line Way:**
```bash
cd keystone-race-calculator
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 3️⃣ Connect to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Click "Import" next to your repository

### 4️⃣ Deploy

1. Framework Preset: **Next.js** ✅ (auto-detected)
2. Root Directory: `./`
3. Click **"Deploy"**
4. Wait 1-2 minutes ☕

### 5️⃣ Done!

Your site is live at: `https://your-project.vercel.app`

---

## ✅ What's Already Configured

- ✅ Vercel Analytics (real-time visitor tracking)
- ✅ Speed Insights (performance monitoring)
- ✅ Mobile responsive design
- ✅ All calculations working
- ✅ Export functionality
- ✅ Custom distances support

---

## 🔄 Making Changes Later

1. Edit files
2. Commit: `git add . && git commit -m "Update"`
3. Push: `git push`
4. Vercel auto-deploys! ⚡

---

## 📊 View Analytics

After deployment:
- https://vercel.com/YOUR_USERNAME/YOUR_PROJECT/analytics

---

## 🌐 Add Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records
4. SSL auto-configured!

---

## ❓ Troubleshooting

**Build fails?**
- Check package.json is uploaded
- Verify all files in `app/` folder are present

**Can't see repository in Vercel?**
- Adjust GitHub App Permissions in Vercel

**Site not loading?**
- Check deployment logs in Vercel dashboard
- Verify build completed successfully

---

## 📁 Required Files

Make sure you upload ALL of these:

```
keystone-race-calculator/
├── app/
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── public/
│   └── README.md
├── package.json
├── next.config.js
├── .gitignore
└── README.md
```

---

## 🎯 That's It!

Your race pacing calculator will be live on the internet, complete with analytics tracking!

**Questions?** Check the main README.md for more details.
