# Building ExamHub Desktop for Windows

## Requirements (on your Windows PC)

- **Node.js 20 or later** — https://nodejs.org (choose the LTS installer)
- **pnpm** — run this in PowerShell after Node.js is installed:
  ```
  npm install -g pnpm
  ```
- **Visual Studio Build Tools** (needed to compile `better-sqlite3`):
  - Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
  - During install, select **"Desktop development with C++"**

---

## Step 1 — Install dependencies for the whole project

Open PowerShell in the **root folder** of this project (not inside `desktop/`):

```powershell
pnpm install
```

## Step 2 — Install Electron dependencies

```powershell
cd desktop
npm install
cd ..
```

## Step 3 — Build the frontend

Still from the **root folder**:

```powershell
$env:PORT="3000"; $env:BASE_PATH="/"; pnpm --filter @workspace/cbt-app build
```

## Step 4 — Copy frontend + build the app

```powershell
cd desktop
npm run build
```

## Step 5 — Package for Windows

To create an **installer (.exe)** and a **portable single-file .exe**:

```powershell
npm run package:win
```

The output will appear in `desktop/release/`:
- `ExamHub Setup X.X.X.exe` — installs to Program Files
- `ExamHub X.X.X.exe` — portable, no install needed, just double-click and run

---

## Running after install

1. Double-click `ExamHub Setup X.X.X.exe` (or the portable `.exe`)
2. The app opens a window — **no browser or internet needed**
3. Default admin login: `admin@examhub.com` / `admin123`
4. Student data is saved permanently in your Windows user folder

## Where data is stored

All student records, exams, and results are saved to:
```
C:\Users\<YourName>\AppData\Roaming\ExamHub\examhub.db
```

This is a standard SQLite file. Back it up to preserve all data.

---

## Troubleshooting

**"better-sqlite3" build error:**
Make sure Visual Studio Build Tools with C++ desktop workload is installed, then run:
```powershell
npm install --build-from-source
```

**App opens but shows blank page:**
The frontend wasn't built. Re-run steps 3 and 4.

**Port 13337 already in use:**
Another ExamHub instance is running. Close it first.
