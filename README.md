# Keystone Endurance - Race Pacing Calculator

A sophisticated race pacing calculator for triathletes and distance runners. Calculate optimal pacing strategies based on current fitness or target finish times.

## Features

- **Triathlon Support**: Sprint, Olympic, Half Ironman, Full Ironman, + Custom Distances
- **Running Support**: 5K, 10K, Half Marathon, Full Marathon
- **Dual Approaches**: 
  - Current Fitness: Based on your actual metrics (CSS, FTP, threshold pace)
  - Target Time: Work backwards from your goal finish time
- **Athlete Level Customization**: Recreational, Intermediate, Competitive, Elite
- **Science-Based Calculations**: Uses validated formulas (Mifflin-St Jeor, Nikolaidis, aerodynamic modeling)
- **Mobile Optimized**: Fully responsive design for all devices
- **Export Results**: Download complete pacing strategy as text file

## Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics + Speed Insights
- **Styling**: Inline styles with responsive breakpoints

---

## 🚀 Deploy to Vercel via GitHub

### Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Git installed on your computer

### Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Repository settings:
   - **Name**: `keystone-race-calculator` (or your preferred name)
   - **Description**: "Race pacing calculator for triathletes and distance runners"
   - **Visibility**: Public or Private (your choice)
   - ✅ **DO NOT** initialize with README, .gitignore, or license
4. Click **"Create repository"**

### Step 2: Upload Code to GitHub

#### Option A: Using GitHub Web Interface (Easiest)

1. On your new repository page, click **"uploading an existing file"**
2. Drag and drop ALL files from this folder:
   ```
   - app/
   - package.json
   - next.config.js
   - .gitignore
   - README.md
   ```
3. Add commit message: "Initial commit - Keystone Race Calculator"
4. Click **"Commit changes"**

#### Option B: Using Git Command Line

```bash
# Navigate to this project folder
cd keystone-race-calculator

# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Keystone Race Calculator"

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository**:
   - Click **"Import"** next to your GitHub repository
   - If you don't see it, click **"Adjust GitHub App Permissions"** to grant access
4. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)
   - No environment variables needed
5. Click **"Deploy"**

### Step 4: Wait for Deployment

- Vercel will build and deploy your app (takes 1-2 minutes)
- Once complete, you'll see: **"Congratulations! 🎉"**
- Your app is now live at: `https://your-project-name.vercel.app`

### Step 5: Verify Analytics (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Analytics"** tab
   - Vercel Analytics is automatically enabled!
   - View real-time visitor data
3. Click **"Speed Insights"** tab
   - See Core Web Vitals
   - Monitor performance metrics

---

## 📊 Vercel Analytics & Speed Insights

**Already Configured!** ✅

This project includes:

### Vercel Analytics
- **Real-time visitor tracking**
- **Geographic insights**
- **Referral sources**
- **Device & browser stats**
- No configuration needed - works automatically

### Vercel Speed Insights
- **Core Web Vitals monitoring**
- **Performance scores**
- **Real user metrics (RUM)**
- **Automatic optimization suggestions**

**View your analytics**: 
`https://vercel.com/YOUR_USERNAME/YOUR_PROJECT/analytics`

---

## 🔄 Making Updates

After your initial deployment:

1. **Edit files locally** (or on GitHub web interface)
2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. **Vercel auto-deploys** - Your site updates automatically!

---

## 🌐 Custom Domain (Optional)

1. In Vercel dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically generated

---

## 📱 Features Overview

### Calculation Types

**Current Fitness Approach:**
- Uses your actual metrics (CSS, FTP, threshold pace/HR)
- Athlete level adjustment (80-95% threshold)
- Physics-based bike speed calculations
- Nikolaidis Formula for HR zones

**Target Time Approach:**
- Reverse engineers required paces
- Typical split percentages by race distance
- Accounts for transitions

### Supported Race Types

**Triathlon:**
- Sprint (0.5mi/12.4mi/3.1mi)
- Olympic (0.93mi/24.8mi/6.2mi)
- Half Ironman (1.2mi/56mi/13.1mi)
- Full Ironman (2.4mi/112mi/26.2mi)
- Custom distances (any combination)

**Running:**
- 5K
- 10K
- Half Marathon
- Full Marathon

---

## 🛠️ Local Development

If you want to run this locally:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to:
http://localhost:3000
```

---

## 📄 License

© 2026 Keystone Endurance

---

## 💡 Support

For questions or support:
- **Email**: coach@keystoneendurance.com
- **Website**: [Your Website URL]

---

## ✅ Deployment Checklist

- [ ] GitHub repository created
- [ ] Code uploaded to GitHub
- [ ] Vercel account connected to GitHub
- [ ] Project deployed to Vercel
- [ ] Deployment successful (green checkmark)
- [ ] Website accessible at Vercel URL
- [ ] Analytics enabled and tracking
- [ ] Speed Insights enabled
- [ ] (Optional) Custom domain configured

**Your calculator is now live! 🎉**
