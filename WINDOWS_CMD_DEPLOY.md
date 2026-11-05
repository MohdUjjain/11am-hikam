# Publish 11AM Hikam from Windows Command Prompt

This ZIP contains the full 34-dossier book and the GitHub Pages/PWA files. There is **no enclosing directory** inside the ZIP: extract its contents directly into your local `11am-hikam` repository folder, alongside the existing `README.md` and `.git` folder. Replace the README from the archive when asked. Never delete `.git`.

## 1. One-time: clone the repository (skip if it already exists locally)

Open **Command Prompt (CMD)**. Choose your own working folder; this example uses Documents:

```bat
cd /d "%USERPROFILE%\Documents"
git clone https://github.com/MohdUjjain/11am-hikam.git
cd 11am-hikam
```

If you already have a local clone, instead run `cd /d "C:\path\to\11am-hikam"` (substitute your real path) and skip the clone step.

## 2. Extract the downloaded ZIP into the repository root

If the ZIP is in Downloads under the exact filename linked in the chat:

```bat
tar -xf "%USERPROFILE%\Downloads\11am_hikam_github_pages_offline_pwa_READY.zip" -C .
```

Alternative: right-click the ZIP in File Explorer, choose **Extract All**, then copy the **contents** (not a top-level enclosing folder) into `11am-hikam`, accepting replace/overwrite prompts. The root of `11am-hikam` must contain `index.html`, `service-worker.js`, `manifest.webmanifest`, the `icons` folder, and `build.py`.

## 3. Verify and publish

```bat
py -3 build.py --check
git status
git add -A
git commit -m "Publish Hikam offline-capable study book"
git push -u origin main
```

If `py` is unavailable but Python is installed, use `python build.py --check`. If you edit the modular source files later, run `py -3 build.py` **before** committing to regenerate `index.html`, `philosophy_study_notes.html`, and the versioned `service-worker.js`.

## 4. Turn on GitHub Pages (one time)

Open `https://github.com/MohdUjjain/11am-hikam/settings/pages`.

Select **Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**.

Your reading URL is `https://mohdujjain.github.io/11am-hikam/` after GitHub Pages deploys it.

## 5. Install and verify offline reading

Open the URL while connected to the internet. Open the book's Contents sidebar and confirm the offline status says **Entire book saved offline**. Chrome/Edge: use the browser's **Install app** option. iPhone/iPad: use **Share → Add to Home Screen**. In the sidebar, **Keep on this device** asks the browser to use persistent storage where supported; it is not guaranteed.

To test: load the book online once, then disconnect Wi-Fi/mobile data and reopen its installed app. All 34 dossiers and the local interface should remain available. Font files from Google Fonts are not included in the offline bundle; offline fallback fonts may look different. Browsers/operating systems can still erase cached data (e.g., when site data is cleared).

## Important

- **Do not** upload the ZIP itself to GitHub: extract first and commit its files.
- **Do not** delete the existing `.git` directory.
- **Do not** create a nested directory `11am-hikam/11am-hikam-pwa/` in the repository; GitHub Pages must find `index.html` at the repo root.
- Only GitHub's `main` branch and GitHub Pages settings control publication. The files in this package have **not** been pushed by ChatGPT.
