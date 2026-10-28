# LinsEz — Phase 1 frontend demo

A mobile-first personal link library based on the supplied screen designs. It is a PWA with realistic sample content. Changes are saved in this browser using `localStorage`; there is no account or server-side data storage.

The desktop web app has a persistent workspace sidebar, collection shortcuts, a global search control with **Ctrl/⌘ K**, a quick-save action, and wider page layouts. The original phone layout remains available at smaller widths.

## Start

Requires Node.js 20 or newer. No package installation is needed.

```bash
npm run dev
```

Open **http://localhost:4173**. Use a phone-sized browser window for the intended layout. `PORT=5000 npm run dev` uses another port on macOS/Linux; in PowerShell use `$env:PORT=5000; npm run dev`.

## Try the demo

- **Home** shows saved content and filters by type, source, or favorites.
- **Save** accepts an `http` or `https` URL, fetches a public page's title, description, image and keyword tags when available, and lets you edit every field before saving. New links without a thumbnail get a designed fallback preview. Duplicate URLs open the existing save.
- **Share to LinsEz** from a supported device's share sheet after installing the PWA. The shared URL, title and message open the Save screen for review. You can also paste a URL directly into Save.
- **Collections** can be opened, created, edited, and deleted. Deleting a collection keeps its links.
- **Discover** offers sample ideas; save or favorite one to add it to the library.
- **Search** looks across saved links and sample ideas. Search terms can be recalled from recent searches.
- **Content Detail** allows favoriting, editing title, URL, description, tags and type, editing notes, changing collection, deleting a saved item, and opening its original URL in a new tab.
- **Profile** lets you edit the sample profile label, switch appearance, export your library as JSON, or reset the demo.

## Install and offline use

The app includes a web manifest, 192px and 512px icons, and a service worker that caches its shell and local preview art. On **Chrome/Edge desktop**, open the app and choose **Install LinsEz** from the address bar or browser menu. On **Android Chrome**, use **Add to Home screen**; then share a webpage from another app and choose **LinsEz** in the share menu. On **iPhone Safari**, use **Share → Add to Home Screen** to install, then paste links in LinsEz; the PWA share target is not supported by every browser or OS. Visit the app once while online before testing offline. The local demo server must be running for the first visit; after installation, previously visited screens and local data remain available offline.

The `/api/preview` endpoint in the included Node server retrieves metadata from public HTML pages. It does not store fetched content. Sites that block automated requests, including some social posts, may provide no preview; the shared title and editable fields still let you save the link. Previews need a connection, while existing local saves remain usable offline. If you deploy the PWA, deploy the Node server behind HTTPS as well; static hosting alone cannot fetch cross-site metadata.

The six editorial preview photos were generated for this project as one local contact sheet. Prompt: a 3×2 grid of alpine lake, minimal workspace, Earth horizon, Mediterranean coast, modern black architecture, and healthy food bowl, with no text or interface elements. Generated with the built-in image generation tool.
