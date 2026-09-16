// See background.js for why `browser` is preferred over `chrome` here.
const api = typeof browser !== "undefined" ? browser : chrome;

const input = document.getElementById("appUrl");
const status = document.getElementById("status");

// `config.js` (loaded before this script — see options.html) sets the
// global `JOB_TRACKER_DEFAULT_APP_URL`, baked in at build time from
// NEXT_PUBLIC_APP_URL. A saved override always wins; otherwise pre-fill
// with that default so most people never need to type anything here.
api.storage.sync.get("appUrl").then(({ appUrl }) => {
  input.value = appUrl || self.JOB_TRACKER_DEFAULT_APP_URL || "";
});

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  status.className = "";
  status.textContent = "";

  let url;
  try {
    url = new URL(input.value);
  } catch {
    status.className = "error";
    status.textContent = "Enter a full URL, including https://";
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    status.className = "error";
    status.textContent = "URL must be http:// or https://";
    return;
  }

  const appUrl = url.origin;
  api.storage.sync.set({ appUrl }).then(() => {
    input.value = appUrl;
    status.className = "saved";
    status.textContent = "Saved.";
  });
});
