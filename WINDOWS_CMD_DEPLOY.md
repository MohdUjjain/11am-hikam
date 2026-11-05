# Windows CMD — 11AM Hikam hosting enhancement

This package is prepared for `https://github.com/MohdUjjain/11am-hikam` and does not push or commit automatically.

## Apply the hosting-only patch to your existing clone

1. Download `11am_hikam_hosting_only_overlay_2026-11-05.zip`.
2. Open **Command Prompt**, navigate to the folder that already contains the cloned repository, and extract the ZIP **into the root of that folder**.

```bat
cd /d "%USERPROFILE%\Documents\11am-hikam"
tar -xf "%USERPROFILE%\Downloads\11am_hikam_hosting_only_overlay_2026-11-05.zip" -C .
```

If your local repository is stored elsewhere, use its actual folder path instead.

3. Verify and publish:

```bat
py -3 build.py --check
py -3 scripts\verify_publication.py
git add -A
git commit -m "Improve Hikam hosting, link previews and offline updates"
git push origin main
```

Run `py -3 build.py` before `--check` **only if you later edit source files**. The distributed ZIP already contains current generated outputs.

If `py` is unavailable, use `python` instead. The new GitHub Actions workflow checks both commands after each push.

## Alternative: complete project ZIP

`11am_hikam_hosting_upgrade_full_2026-11-05.zip` has the entire 34-dossier source project, generated website, and all hosting files. Extract it into the same repository folder instead of the patch if you want a complete snapshot.

## After publishing

- Site: https://mohdujjain.github.io/11am-hikam/
- Social card: https://mohdujjain.github.io/11am-hikam/og-image.jpg
- Sitemap: https://mohdujjain.github.io/11am-hikam/sitemap.xml
- CI: GitHub → Actions → Verify Hikam website publication
- Offline test: first open the page online, let the full book save, then switch off network and reopen.
- **Existing installs:** this first release may need one manual reload to load the new edition-notification code. Future updates notify automatically.
- Font binaries are not shipped; on-device caching of Google Fonts improves offline fidelity after an online visit, but device storage is always browser-managed.
- `source_materials/` remains public in your repository; its contents were not changed.
