# Portfolio

Personal developer portfolio. Single `index.html`, no build step, no frameworks.

Open `index.html` in a browser to view it locally.

## Editing

- Content (name, projects, experience, skills, contact) is plain HTML in `index.html`.
- Colors and fonts are tokens in the `:root` block at the top of the `<style>`.
- To show a real project screenshot, replace a card's `.shot-body` contents with `<img src="your-screenshot.png" alt="...">`.

## Hosting on GitHub Pages

The site is ready for GitHub Pages as-is: `index.html` sits at the repo root, there is no build step, and `.nojekyll` tells Pages to serve the files untouched.

To publish it:

1. Open the repo on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick branch `main` and folder `/ (root)`, then click **Save**.
4. After a minute or two the site is live at `https://shaikhaan.github.io/portfolio/`.
