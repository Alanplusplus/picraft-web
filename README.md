# PiCraft web

Front end of [PiCraft](https://www.picraft.ai): finished, correctly sized design files from a short form. Live site: **https://www.picraft.ai**

PiCraft is a set of single-purpose makers. Instead of a blank prompt box, each maker asks for the details that matter (names, dates, prices, product details) and returns files in the sizes and formats the job needs: print PDFs with bleed, transparent PNGs, pure white product photos, thumbnails under the upload limit.

Also listed on [There's An AI For That](https://theresanaiforthat.com/@picraftai/).

## What is in here

- **Makers** (`/create`): invitations, menus, flyers, business cards, YouTube thumbnails, LinkedIn banners, book covers, stickers, shirt graphics, marketplace product photos, MLS listing photos and photo trends. Each has a form, examples and a style page per look.
- **Size guides** (`/sizes`) and **blog** (`/blog`): specs with the official source for every number.
- **Free tools** (`/tools`): an image size checker that runs in the browser (nothing is uploaded) and downloads guide templates at the exact pixel size.
- **Gallery**, **file history** (`/history`), **press kit** (`/press`), legal pages.
- SEO plumbing: sitemap, structured data, build-time internal link validation, Pinterest feeds.

Page content lives as JSON under `src/data/` (makers, styles, guides, tools). The generation API is a separate backend that this app reaches through server-side routes under `src/app/api`.

## Stack

Next.js (App Router) 16, React 19, Tailwind CSS 4, TypeScript. Deployed on Vercel.

Next.js 16 has breaking changes from older versions. Read the guides in `node_modules/next/dist/docs/` before changing framework-level code.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # also validates internal links and logs pages held back as noindex
npm start
```

The app expects the backend at `BACKEND_URL` (default `http://127.0.0.1:8040`) and a shared `SERVICE_SECRET`. Put local values in `.env.local`, which is not committed.

Optional public settings, all prefixed `NEXT_PUBLIC_`: `SITE_URL`, `GA_MEASUREMENT_ID`, the site verification tags, `LEGAL_ENTITY` / `LEGAL_ADDRESS` / `GOVERNING_LAW`, and `SOCIAL_PINTEREST`, `SOCIAL_X`, `SOCIAL_LINKEDIN`, `SOCIAL_YOUTUBE`, `SOCIAL_GITHUB`, `SOCIAL_INSTAGRAM`, `SOCIAL_TIKTOK` (a profile link appears in the footer once its variable is set).

## Layout

```
src/app          routes (pages, api, sitemap, feeds)
src/components   UI components
src/data         JSON content: scenes, styles, guides, tools
src/lib          content readers, SEO and schema helpers, link validation
public           images and static assets
```
