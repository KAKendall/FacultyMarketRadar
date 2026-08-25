# Publish Faculty Market Radar on GitHub

These instructions use only the GitHub website. You do not need GitHub Desktop, Git commands, or a coding application.

## What you need

- A GitHub account. You can create one at https://github.com/signup.
- The downloaded file `faculty-market-radar.zip`.
- About 10–20 minutes for the first upload and automated job check.

The website and job information are intended to be public. The easiest option is therefore a **public repository**, which supports GitHub Pages on GitHub's free plan.

## Step 1: Unzip the website

1. Find `faculty-market-radar.zip` in your Downloads folder.
2. Right-click it and select **Extract All**.
3. Open the extracted `faculty-market-radar` folder.

Inside that folder, you should see:

- `.github`
- `data`
- `scripts`
- `app.js`
- `index.html`
- `package.json`
- `README.md`
- `styles.css`

Do not upload the ZIP file itself.

## Step 2: Create the GitHub repository

1. Sign in at https://github.com.
2. In the upper-right corner, click the **+** menu.
3. Click **New repository**.
4. In **Repository name**, enter `faculty-market-radar`.
5. Select **Public**.
6. Leave **Add a README file**, `.gitignore`, and **Choose a license** turned off. The website package already contains its own README.
7. Click **Create repository**.

GitHub will show a “Quick setup” page for the empty repository.

## Step 3: Upload the website files

1. On the Quick setup page, click **uploading an existing file**.
2. Return to the extracted `faculty-market-radar` folder on your computer.
3. Select **everything inside the folder**. Be sure to include the `.github`, `data`, and `scripts` folders.
4. Drag the selected items into the GitHub upload area.
5. Wait until GitHub finishes listing all the uploaded files.
6. In the commit-message box, enter `Initial Faculty Market Radar upload`.
7. Click **Commit changes**.

Important: upload the folder's contents directly. If GitHub shows a top-level folder named `faculty-market-radar` with `index.html` inside it, the files are one level too deep.

## Step 4: Confirm the repository layout

Return to the repository's **Code** tab. At the top level, you should see `index.html`, `app.js`, `styles.css`, `data`, `scripts`, and `.github`.

Click `.github`, then `workflows`. Confirm that `weekly-refresh.yml` is there. This file publishes the website and performs the weekly refresh.

If `.github/workflows/weekly-refresh.yml` is missing, upload the `.github` folder before continuing.

## Step 5: Turn on GitHub Pages

1. At the top of the repository, click **Settings**.
2. In the left sidebar, find **Code and automation** and click **Pages**.
3. Under **Build and deployment**, find **Source**.
4. Select **GitHub Actions**.
5. If GitHub displays suggested workflow templates, do not create another workflow. The uploaded package already includes one.

## Step 6: Run the first update and deployment

1. At the top of the repository, click **Actions**.
2. If GitHub asks whether to enable workflows, click the button confirming that you understand and want to enable them.
3. In the left sidebar, click **Weekly job refresh and deploy**.
4. On the right side, click **Run workflow**.
5. Leave the branch set to `main` and click the green **Run workflow** button.
6. Refresh the page after a few seconds. A new workflow run should appear.
7. Wait for the yellow dot to become a green checkmark. The first run can take several minutes because it checks the job links before publishing.

## Step 7: Open the website

1. Return to **Settings → Pages**.
2. Near the top, GitHub should display a message that the site is live.
3. Click **Visit site**.

The address will usually be:

`https://YOUR-GITHUB-USERNAME.github.io/faculty-market-radar/`

Replace `YOUR-GITHUB-USERNAME` with the name shown in your GitHub profile address.

## What happens every week

No further action is required. GitHub runs **Weekly job refresh and deploy** every Monday. It checks the monitored sources and published job links, updates the data, closes postings with passed deadlines, and republishes the website.

You can also run it at any time from **Actions → Weekly job refresh and deploy → Run workflow**.

## Troubleshooting

### The workflow does not appear under Actions

Check that this exact file exists in the repository:

`.github/workflows/weekly-refresh.yml`

If the entire website is inside an extra `faculty-market-radar` folder, move or re-upload the contents so `index.html` and `.github` are at the top level.

### The workflow shows a red X and mentions permission to push

1. Open **Settings → Actions → General**.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Click **Save**.
5. Return to **Actions**, open the failed run, and click **Re-run all jobs**.

Some organization-owned GitHub accounts prevent this setting from being changed. In that case, a GitHub organization administrator must allow write access for workflows.

### The site shows “404 — File not found”

Confirm all three items:

1. The workflow completed with a green checkmark.
2. **Settings → Pages → Source** is set to **GitHub Actions**.
3. `index.html` is at the top level of the repository.

After correcting a setting, run the workflow again and wait a few minutes.

### The page loads but contains no jobs

Confirm that `data/jobs.json` is present at the top level under the `data` folder. Then run the workflow again.

### The website still shows old information

Open **Actions → Weekly job refresh and deploy** and check the most recent run. If it failed, open it to see the failed step, then use **Re-run all jobs** after correcting the issue.

## Official GitHub help

- Create a GitHub Pages site: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Configure GitHub Actions as the publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Run a workflow manually: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
