# Store listing copy

Paste-ready text for the Chrome Web Store Developer Dashboard and Firefox Add-ons (AMO)
submission forms. Neither store lets you skip these fields, and Chrome specifically rejects
`activeTab`/`storage` submissions without a permission justification and a privacy policy URL.

## Short description (Chrome: max 132 characters)

> Save the job listing you're viewing to your own self-hosted Job Tracker, one click.

## Detailed description

> Job Tracker Quick Add is the companion extension for a self-hosted
> [Job Tracker](https://github.com/allanweber/job-tracker) instance — a personal kanban board
> for job applications.
>
> Click the toolbar icon on any job listing page to open a small popup that scrapes the
> posting's details (position, company, location, salary, etc.) into your own Job Tracker board,
> without switching tabs or copy-pasting the URL.
>
> **This only works with your own Job Tracker instance** — it's not a hosted service. On first
> use it asks for your instance's URL (the same one you sign in at) and remembers it. You need
> to already be signed in to Job Tracker in this browser for the popup to save anything.
>
> Open source: github.com/allanweber/job-tracker

## Category

Productivity (Chrome) / Other or Web Development (Firefox — AMO's category list is coarser).

## Privacy policy URL

`https://github.com/allanweber/job-tracker/blob/main/extension/PRIVACY.md`

## Single purpose (Chrome "Privacy practices" tab)

> Opens the user's own configured Job Tracker web app in a small popup, pre-filled with the
> current tab's URL, so a job listing can be saved to their board without switching tabs.

## Permission justifications (Chrome)

- **`activeTab`** — needed to read the URL of the tab the user is viewing at the moment they
  click the toolbar icon, so it can be passed to their own Job Tracker instance to pre-fill the
  new job's link. No other tab data is read, and no host permissions are requested.
- **`storage`** — only used if the user overrides the (build-time, pre-filled) URL of their own
  Job Tracker instance in Options, so the override doesn't need to be re-entered every time. No
  other data is stored.

## Screenshots

Both stores require at least one. Since the popup only renders real content once signed in to a
real instance, take these against your own running deployment rather than trying to fake one:

1. Open a real job listing page with the extension installed and configured.
2. Click the toolbar icon.
3. Screenshot the resulting popup (Chrome wants 1280×800 or 640×400 PNG/JPEG).

## Support / homepage URL

`https://github.com/allanweber/job-tracker`
