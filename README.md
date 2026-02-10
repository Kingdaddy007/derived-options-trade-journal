# Derived Options Trade Journal

A local-first trading journal for derived options (Rise/Fall, Touch/No-Touch), built with React, Next.js, and shadcn/ui.

## 🚀 Deployment Instructions

### 1. Initialize & Commit (Local)
Since this is a fresh setup, you need to save your changes locally first:

1. Open your terminal in this folder (`trade-journal-app`).
2. Run these commands:
   ```bash
   git add .
   git commit -m "Initial commit"
   ```
   *(If prompted to configure user/email, run: `git config user.email "you@example.com"` and `git config user.name "Your Name"` first)*

### 2. Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Run these commands:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### 3. Deploy on Vercel
1. Go to [Vercel](https://vercel.com/new).
2. Import your new GitHub repository.
3. Click **Deploy**.
4. That's it! Your journal will be live.

## ✨ Features
- **Journal Trades**: Log Rise/Fall & Touch trades with rich details.
- **Strategy Library**: Define triggers, confirmations, and risk rules.
- **Analytics**: Track win rates, profit, and return on investment.
- **Local Storage**: Data stays in your browser (no database required).
- **Export/Import**: Backup your data to JSON files.

## 🛠️ Development
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it.
