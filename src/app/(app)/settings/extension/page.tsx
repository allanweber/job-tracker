export default function ExtensionPage() {
  return (
    <div className="flex max-w-[480px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Browser extension</h1>
        <p className="text-sm text-muted-foreground">
          Same quick-add popup as the{" "}
          <a href="/settings/bookmarklet" className="underline">
            bookmarklet
          </a>
          , but as a real toolbar button instead of a dragged link — mainly useful because a
          browser can&apos;t show a custom favicon for a <code>javascript:</code> bookmark (there&apos;s
          no page to fetch an icon from), while an extension&apos;s icon is just a file it declares.
        </p>
      </div>
      <div className="rounded-lg border p-6 text-sm">
        <p className="font-medium">Chrome / Edge — not published to any store</p>
        <p className="mt-1 text-muted-foreground">
          It&apos;s meant to be loaded unpacked, same spirit as self-hosting the app itself:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Get the app&apos;s source (the same repo you deployed Job Tracker from).</li>
          <li>
            Run <code>pnpm ext:build</code> once (it reads your <code>NEXT_PUBLIC_APP_URL</code> —
            the same variable you already set to build the app — so the extension knows your
            instance&apos;s URL without you typing it in anywhere).
          </li>
          <li>
            Open <code>chrome://extensions</code> (or <code>edge://extensions</code>), turn on{" "}
            <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and select its{" "}
            <code>extension/</code> folder.
          </li>
        </ol>
        <p className="mt-3 text-muted-foreground">
          That&apos;s it — click the toolbar icon on any job listing page. Its Options page is
          only there if you ever want to point it at a different instance.
        </p>
      </div>
      <div className="rounded-lg border p-6 text-sm">
        <p className="font-medium">Firefox</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Run <code>pnpm ext:build</code> once, same as above.</li>
          <li>
            Open <code>about:debugging#/runtime/this-firefox</code>, click{" "}
            <strong>Load Temporary Add-on…</strong>, and select the{" "}
            <code>extension/manifest.json</code> file.
          </li>
        </ol>
        <p className="mt-3 text-muted-foreground">
          Caveat: a temporary add-on is discarded on restart, so you&apos;d redo step 1 each
          session. Release Firefox refuses to permanently install an unsigned extension — for a
          persistent install, either disable signature enforcement in Developer Edition/Nightly,
          or get it signed for self-distribution. Details in the README linked below.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Full details on{" "}
        <a
          href="https://github.com/allanweber/job-tracker/blob/main/extension/README.md"
          className="underline"
        >
          GitHub, in extension/README.md
        </a>
        . Like the bookmarklet, this relies on you already being signed in to Job Tracker in
        this browser.
      </p>
    </div>
  );
}
