# Vercel deployment

The app is a static Vite site. Use the **repository root** as the Vercel Root Directory; do not select `web/`. The source art, room, content and build tools live alongside `web/` and are needed during the build.

## Configuration included

- Node **24.x**, pinned by `package.json` and `.nvmrc`.
- pnpm **11.25.0**, invoked explicitly with npx so builds do not depend on the image's default pnpm version.
- Install: `npx --yes pnpm@11.25.0 install --frozen-lockfile --prod=false` (build tools need dev dependencies).
- Build: `npx --yes pnpm@11.25.0 run build:vercel`.
- Output: `dist/`.
- Character links `/c/<id>`, `/about` and `/list` rewrite to the app entry point. `/world/` assets keep their own URLs and missing files remain 404s.
- Vite's hashed JS/CSS assets may be cached immutably; world files revalidate because their filenames do not contain the build hash.
- No backend, database, API keys or user-supplied secrets are required. Vercel supplies `VERCEL_ENV` automatically.

The build generates atlases, chunks, LODs and the manifest from tracked sources. Ignored/generated directories are excluded from CLI uploads and rebuilt remotely. The Character Lab and inspector are development-only.

## Deploy the prototype for review

Create/link a Vercel project for this repository, leaving the Root Directory at its default repository root. Keep the commands/output from `vercel.json` and enable Vercel's automatically exposed system environment variables (the default).

For a **Preview** deployment, run the Vercel CLI from the repository root:

```sh
pnpm dlx vercel
```

Vercel will guide you through account/project linking and create a preview deployment. Authentication is performed in your own Vercel session. Do not pass `--prod` for the unapproved prototype. Subsequent pushes to a non-production Git branch also produce Preview deployments after the Git integration is connected.

A Preview build uses `pnpm build:preview`: all three historical cards remain visibly marked **DRAFT**, with unresearched text and citations clearly labelled. This is for prototype/advisory review and is not an approved historical release.

## Production approval gate

A Vercel **Production** build runs `pnpm build`. It currently fails deliberately because the three sample cards have `panelApproved: false`. Importing `main` as the project's Production Branch and deploying immediately will therefore hit this gate. Use a Preview deployment to review the current prototype.

Before an approved release, the advisory panel must research/review the named cards and sources, content rules, art and translations. After that review, the approved source cards can be updated in a separate content change and production deployed normally. Do not toggle approval flags or override the Vercel build command merely to make an unapproved production build pass.

If `VERCEL_ENV` is missing, the build defaults to the strict production checks. Unknown contexts fail clearly. An explicit Preview context is required to publish draft review artifacts.

## Verify locally

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile --prod=false
VERCEL_ENV=preview pnpm build:vercel
```

This produces the deployable static review artifact in `dist/`. To confirm the release gate:

```sh
VERCEL_ENV=production pnpm build:vercel
```

The second command must exit nonzero while sample cards remain unapproved. A successful local build verifies the artifact, not a live deployment on Vercel. No deployment is created by these commands.
