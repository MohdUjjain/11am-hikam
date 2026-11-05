# Windows CMD — migrate the existing GitHub checkout

Use the complete organized ZIP rather than a hosting-only overlay for this one-time migration.

1. **Back up or commit your local changes** before starting. The migration will stop if known source files have changed since the reference snapshot.
2. Download `11am_hikam_organized_repo.zip` into your Windows **Downloads** folder.
3. Open Command Prompt and run:

```bat
cd /d "%USERPROFILE%\Documents\11am-hikam"
git status --short

REM If you have uncommitted changes, commit or back them up before proceeding.
tar -xf "%USERPROFILE%\Downloads\11am_hikam_organized_repo.zip" -C .

REM Preview removal of old duplicated source and documentation files:
py -3 src\tools\migrate_flat_repo.py

REM Only unchanged originals are removed; modified files will stop this step:
py -3 src\tools\migrate_flat_repo.py --apply

REM Rebuild the published root page and hashed worker:
py -3 src\build.py
py -3 src\build.py --check
py -3 src\tests\verify_publication.py
py -3 src\tests\validate_structure.py
node src\tests\test_offline_cache.mjs

git status --short
git add -A
git commit -m "Organize Hikam repo into published root and modular src"
git push origin main
```

If `node` is not installed, all Python checks can run without it; the GitHub Actions workflow separately runs the Node offline-cache test after push. Do not skip failed checks before committing.

**Never delete or overwrite `.git/`**. The ZIP does not contain it. The migration script never touches it.

Existing GitHub Pages settings stay **Branch: `main`; Folder: `/(root)`**. After pushing, verify the live site and installed offline copy. A new SW version will be published because `robots.txt` is now in the manifest of offline assets. No downloadable full-book PDF is required.
