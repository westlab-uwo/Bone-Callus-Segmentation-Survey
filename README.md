"Encuesta de instalaciones industriales en la zona regional de la ciudad de Puebla"
UDLAP - 179613
Diego Oswaldo Rodriguez Collantes

# Bone and Callus Segmentation - Expert Ranking Survey

This is a small web page that shows orthopedic surgeons 7 automated bone and
callus segmentation algorithms, and asks them to rank the algorithms from best to worst.
It runs as a static site and saves answers straight to a Google Sheet.

## What is in this folder

```
index.html      the page itself
app.js          all the logic: screens, ranking, drag and drop, submit
config.js       the only file you will edit often (images, algorithms, questions)
styles.css      colors, fonts, layout
Code.gs         goes into Google Apps Script, not into the website
images/2/       the picture files shown on the ranking screen
```

## 1. Running it on your computer

Open a terminal in this folder and run:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. Stop the server
with Ctrl+C when you are done.

This is just for testing, not to publish it on the GitHub repository.

## 2. Editing the questions (Page 2 and 3)

Open `config.js`. Near the top you will find lists like this:

```js
ROLE_OPTIONS: [
  "Resident/Fellow",
  "Attending/Consultant Orthopedic Surgeon",
  "Department Head/Chief",
  "Academic Faculty",
  "Other",
],
```

To add, remove, or rename an option, just edit that list. You do not
need to touch `app.js` for this. The lists you can edit are:

- `ROLE_OPTIONS`
- `PRACTICE_TYPE_OPTIONS`
- `QUALIFICATION_OPTIONS`
- `SUBSPECIALTY_OPTIONS`
- `YEARS_PRACTICE_OPTIONS`

If you want to add a whole new question, that does require editing
`app.js`, in the function called `renderQuestionnaire`.

## 3. Changing the wording on any screen

All the text shown to experts lives in `app.js`, inside these
functions:

- `renderWelcome` Welcome screen
- `renderCoAuthor` Page 1 (name, affiliation, email)
- `renderQuestionnaire` Page 2 (background questions)
- `renderRankingStep` Page 3 (ranking screen and instructions)
- `renderThanks` Thank you message

Just find the sentence you want to change and edit it directly. It is
plain text inside quotes, nothing fancy.

## 4. Replacing or adding images

All images for the ranking screen go in `images/2/`. Each is a
single picture that contains all 7 ultrasound cases so you do not
upload 7 separate files, just one strip image per row.

```
majority_vote.jpg               majority vote overlay
only_original_row.jpg           just the 7 original images, no overlay
original_and_experts_grid.jpg   originals plus one expert example
yiffana_pt.jpg                  algorithm 1
yiffana_blanket.jpg             algorithm 2
pipeline_v10_61.jpg             algorithm 3
pipeline_v10_62.jpg             algorithm 4
pipeline_v10_63.jpg             algorithm 5
pipeline_v10_70.jpg             algorithm 6
pipeline_v10_90.jpg             algorithm 7
```

The "original" row and each algorithm's row are combined into one
picture automatically.

If you rename or add an algorithm, update the `ALGORITHMS` list in
`config.js` to match, using the same file name as the `id`.

```js
ALGORITHMS: [
  { id: "yiffana_pt", label: "Percentile Threshold (Yiffana)" },
  ...
]
```

The `label` is just a note for you, in the survey experts only ever
see "Algorithm 1" through "Algorithm 7", assigned in random order.

## 5. Changing colors and fonts

Open `styles.css`. Near the top there is a block like this:

```css
:root {
  --bg:        #F1F4F3;
  --purple:    #3D1276;
  --wine:      #7E2954;
  ...
}
```

## 6. Connecting it to a Google Sheet

1. Create a new Google Sheet.
2. In the Sheet, go to Extensions, then Apps Script.
3. Delete whatever is there and paste in the full contents of
   `Code.gs`.
4. In `Code.gs`, find this line and put your own Sheet's ID in it:
   ```js
   const ss = SpreadsheetApp.openById("YOUR_SHEET_ID_HERE");
   ```
   The ID is the long string in your Sheet's URL, between `/d/` and
   `/edit`.
5. Click Deploy, then New deployment. Type: Web app. Execute as: Me.
   Who has access: Anyone.
6. Copy the URL it gives you, it ends in `/exec`.
7. Paste that URL into `config.js`, in `APPS_SCRIPT_URL`.

To check it worked, paste the URL into a browser tab. You should see
`{"ok":true,"msg":"Bone & Callus survey endpoint is live."}`.

If you ever redeploy the script, use "Manage deployments" and edit
the existing one instead of creating a new one, this way the URL in
`config.js` stays the same and you do not have to update it again.

Since the script is bound to the Sheet, sharing the Sheet with someone
also gives them access to the script. Bound scripts do not show up as
a separate file in Google Drive, so there is nothing extra to share.

## 7. Putting it online with GitHub Pages

This is what turns the folder into a real link you can send to people.

1. Create a **public** repository on GitHub (private repositories need
   a paid plan for Pages to work). If you are putting this under a lab
   or organization account, create it there directly.
2. Upload every file in this folder to the repository, keeping them
   at the root of the repo, not inside a subfolder. This includes the
   `images/` folder and `westlab-logo-transparent.png`.
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
   git push -u origin main
   ```
3. On GitHub, open the repository and click **Settings** (top menu of
   the repo, not your account settings).
4. In the left sidebar, click **Pages**.
5. Under **Build and deployment**, set **Source** to
   "Deploy from a branch".
6. Under **Branch**, choose `main` and folder `/ (root)`, then
   **Save**.
7. Wait a minute or two, then refresh the Pages settings page. A green
   box appears at the top with the live link, something like:
   ```
   https://your-org.github.io/your-repo-name/
   ```
   That link is what you send to the experts.
8. Every time you push new changes to `main`, GitHub Pages updates the
   live link automatically within a minute or two. No need to redo
   the steps above.

## 8. Before sending it to anyone

- Open the live link yourself and fill it out once, start to finish.
- Check that a new row showed up in your Google Sheet.
- Try it on a phone too, the layout adjusts to smaller screens but a
  real check is safer than assuming.
- Nothing is saved if someone closes the tab partway through, they
  will get a warning from the browser if they try to leave before
  submitting, but there is no way to resume later. Let people know to
  set aside a few uninterrupted minutes.