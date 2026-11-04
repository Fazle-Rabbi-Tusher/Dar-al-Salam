# Vercel deployment

The app is a static Vite site. Use the **repository root** as the Vercel Root Directory; do not select `web/`. The source art, room, content and build tools live alongside `web/` and are needed during the build.

## Deploy the current prototype

Import this GitHub repository into Vercel, keep the Root Directory at its default repository root, and deploy `main`. The commands and output directory are already configured in `vercel.json`. No custom environment variables, backend, database or API keys are needed.

Both Vercel **Production** and **Preview** deployments build the publicly labelled prototype by default. All ten draft cards remain visibly marked **DRAFT**, with unresearched text and citations clearly labelled. A production hosting URL does not mark those cards as panel-approved.

If a deployment from an older commit failed with `panelApproved must be true`, deploy the latest `main`. Keep the Build Command from `vercel.json`; no `VERCEL_ENV` override is needed. Leave `DAR_CONTENT_MODE` unset for the prototype.

Alternatively, deploy from the repository root with the Vercel CLI:

```sh
pnpm dlx vercel        # Preview hosting
pnpm dlx vercel --prod # Production hosting of the same labelled prototype
```

Vercel guides you through account/project linking in your own session. Connecting the Git integration also enables deployments from subsequent pushes.

## Configuration included

- Node **24.x**, pinned by `package.json` and `.nvmrc`.
- pnpm **11.25.0**, invoked explicitly with npx so builds do not depend on the image's default pnpm version.
- Install: `npx --yes pnpm@11.25.0 install --frozen-lockfile --prod=false` (build tools need dev dependencies).
- Build: `npx --yes pnpm@11.25.0 run build:vercel`.
- Output: `dist/`.
- Character links `/c/<id>`, `/about` and `/list` rewrite to the app entry point. `/world/` assets keep their own URLs and missing files remain 404s.
- Vite's hashed JS/CSS assets may be cached immutably; world files revalidate because their filenames do not contain the build hash.

The build generates atlases, chunks, LODs and the manifest from tracked sources. Ignored/generated directories are excluded from CLI uploads and rebuilt remotely. The Character Lab and inspector are development-only.

## Approved-content releases

`pnpm build` and `pnpm build:assets --prod` retain the strict content-approval checks. They intentionally reject the current unapproved sample cards. No approval flags have been changed to make deployment succeed.

Once the advisory panel has reviewed the named cards, sources, content rules, art and translations, an approved release can be built with `pnpm build`. To select that same strict release path in Vercel, explicitly set **`DAR_CONTENT_MODE=approved`** in the relevant Vercel environment. It will fail until the source cards have actually been approved.

`DAR_CONTENT_MODE` is optional: unset or `prototype` builds the draft prototype; `approved` runs the strict release build; unsupported values fail clearly. `VERCEL_ENV` selects the hosting environment and does not determine whether historical content is approved.

## Verify locally

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile --prod=false
VERCEL_ENV=production pnpm build:vercel
```

This reproduces the default Vercel Production-context build and produces the deployable prototype in `dist/`. To confirm that the approval gate is still enforced:

```sh
DAR_CONTENT_MODE=approved pnpm build:vercel
```

The second command must exit nonzero while sample cards remain unapproved. A successful local build verifies the artifact, not a live Vercel deployment.
