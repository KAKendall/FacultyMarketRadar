# Faculty Market Radar

A static, accessible academic job board for doctoral students across business disciplines and Health Policy. The populated dataset combines the supplied planning workbooks and job-posting document with live-link verification completed on August 25, 2026.

## Put the website online with GitHub

You do not need to write code or use a command line. Follow the browser-only instructions in [GITHUB-SETUP.md](GITHUB-SETUP.md).

The short version is:

1. Unzip `faculty-market-radar.zip` on your computer.
2. Create a new **public** GitHub repository named `faculty-market-radar`.
3. Upload the **contents inside** the unzipped folder—not the ZIP file or the outer folder.
4. Confirm that `index.html` and the `.github` folder appear at the top level of the repository.
5. Open **Settings → Pages** and select **GitHub Actions** under “Source.”
6. Open **Actions → Weekly job refresh and deploy → Run workflow**.
7. After the workflow shows a green checkmark, return to **Settings → Pages** and click **Visit site**.

The site will normally be available at:

`https://YOUR-GITHUB-USERNAME.github.io/faculty-market-radar/`

The scheduled script checks every URL in `data/sources.json` and every published job URL, discovers links whose titles match the target roles and fields, reads structured `JobPosting` metadata where available, marks passed deadlines closed, writes a source-health log, and republishes the site. Because university sites vary, newly discovered automated rows are labeled conservatively and link to the source of record.

## Local preview

Serve the folder over HTTP (opening `index.html` directly will not allow JSON loading):

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Editorial maintenance

- `data/jobs.json`: verified role records and statuses.
- `data/sources.json`: official pages and trusted recruiting sources monitored weekly.
- `data/verification-audit.json`: August 25 import totals and the records withheld as inactive, unverifiable, or redistribution-restricted.
- `data/source-health.json`: generated audit log after the first refresh.

Always confirm a deadline and application requirements on the linked posting before advising a student to apply.
