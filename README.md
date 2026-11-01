# Portfolio

Personal developer portfolio. Single `index.html`, no build step, no frameworks.

Open `index.html` in a browser to view it locally.

## Editing

- Content (name, projects, experience, skills, contact) is plain HTML in `index.html`.
- Colors and fonts are tokens in the `:root` block at the top of the `<style>`.
- Each project's diagram is an inline SVG inside its `<figure class="fig">`. Boxes are `<rect>`, connectors are `<path>`, labels are `<text>`.
- The "Calm" button in the top bar turns off all animation for visitors who prefer less motion.

## Hosting on GitHub Pages

The site is ready for GitHub Pages as-is: `index.html` sits at the repo root, there is no build step, and `.nojekyll` tells Pages to serve the files untouched.

To publish it:

1. Open the repo on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick branch `main` and folder `/ (root)`, then click **Save**.
4. After a minute or two the site is live at `https://shaikhaan.github.io/portfolio/`.
