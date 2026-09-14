"use client";

export function BookmarkletLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      className="inline-block cursor-grab rounded-md border bg-secondary px-4 py-2 text-sm font-medium active:cursor-grabbing"
    >
      📌 Add to Job Tracker
    </a>
  );
}
