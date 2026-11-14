# Secure Notes Frontend Client

This is the standalone frontend client for the **Secure Note-Taking Application**.

---

## 1. Overview
- **Zero-Template / Zero-Bloat**: Built with clean semantic HTML5, CSS3, and modern Vanilla JavaScript (Fetch API).
- **Independent & Decoupled**: Can run from any port, folder, or static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
- **Configurable Backend Connection**: Contains an integrated API URL bar allowing instant switching between local development (`http://localhost:5000`) and production cloud deployments (e.g. `https://your-api.vercel.app`).

---

## 2. Features
1. **Authentication**: Register with user interests, login, session status bar, secure JWT handling in `localStorage`.
2. **Notes Management**: Create notes, paginated list view, update note, delete note with ownership checks.
3. **Community Posts**: Publish posts, paginated public feed.
4. **Aggregations Viewer**:
   - **Scenario 1**: Run the interest grouping aggregation pipeline and view results in real-time.
   - **Scenario 2**: Run the `$lookup` pipeline to retrieve all posts authored by a user.
5. **Admin Console**: Conditionally rendered when logged in with an `admin` role (manage users, switch roles, inspect all system notes).

---

## 3. How to Run Locally

You can open `index.html` directly in any web browser, or serve it with a local web server:

### Option A: Using npx serve
```bash
npx serve -l 3000
```
Then visit: [http://localhost:3000](http://localhost:3000)

### Option B: Using Python built-in server
```bash
python -m http.server 3000
```

### Option C: Using VS Code Live Server
Right-click `index.html` and click **Open with Live Server**.

---

## 4. Connecting to the Backend
- By default, the frontend attempts to connect to `http://localhost:5000`.
- To change the backend URL:
  1. Open the app in your browser.
  2. In the top bar labeled **Backend API Base**, enter your backend URL (e.g., `https://secure-notes-api.vercel.app`).
  3. Click **Set URL** and then **Ping API** to confirm the connection.

---

## 5. Deploying to Vercel
Deploying this frontend to Vercel is instantaneous:
```bash
vercel --prod
```
The included `vercel.json` ensures that clean URLs and client-side routes are correctly handled.
