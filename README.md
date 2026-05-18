# History Zoom

An interactive historical calendar with editable events, text blocks, and Fed rate decisions.

## Running Locally (XAMPP)

1. Place all files in `C:\xampp\htdocs\History - Zoom\`
2. Place `csv_write.php` in `C:\xampp\htdocs\` (root)
3. Start Apache in XAMPP Control Panel
4. Open `http://localhost:8080/History%20-%20Zoom/`

## Deployed on Render.com

The app runs as a PHP web service. CSV files are stored on a persistent disk at `/var/data/`.

## Syncing Between Desktop and Render

After editing online:
- Changes are saved to Render's persistent disk automatically
- To pull CSV changes to your desktop, download the CSVs from the Render dashboard
  or add a download endpoint

After editing locally:
- Commit and push to GitHub
- Render will auto-deploy from the `main` branch
