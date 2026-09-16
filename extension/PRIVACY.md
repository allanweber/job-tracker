# Privacy Policy — Job Tracker Quick Add

This extension collects no data, and sends no data anywhere except to your own Job Tracker
instance — its URL is baked in when it's built (from the same setting used to build the app
itself), not something you have to enter.

- **What it stores:** nothing, unless you choose to override the built-in URL in Options — that
  override is kept locally via `chrome.storage.sync`/`browser.storage.sync`, the browser's own
  account-synced storage. Nothing is sent to the extension's author.
- **What it reads:** the URL of the tab you're on, only at the moment you click the toolbar
  icon, only to pass it to the popup it opens.
- **Where it's sent:** to your own Job Tracker instance, and nowhere else. That's your own
  self-hosted server — this extension's author has no access to it or its data.
- **Third parties:** none. No analytics, no telemetry, no ad networks.

Job Tracker itself (the web app this extension talks to) has its own handling of whatever data
you enter there (job listings, resumes, etc.) — see that deployment's own privacy practices,
which are between you and however you've configured/hosted it.

Questions: open an issue at
[github.com/allanweber/job-tracker](https://github.com/allanweber/job-tracker).
