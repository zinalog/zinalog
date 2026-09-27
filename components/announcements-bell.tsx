"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpCircle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Info,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import type { Announcement, AnnouncementType } from "@/lib/announcements";

const POLL_INTERVAL_MS = 30 * 60 * 1000;
const SEEN_KEY = "zinalog:announcements:seen";

const TYPE_STYLES: Record<
  AnnouncementType,
  { color: string; icon: typeof Info }
> = {
  info: { color: "var(--accent)", icon: Info },
  success: { color: "var(--success)", icon: CheckCircle2 },
  warning: { color: "var(--warning)", icon: TriangleAlert },
  error: { color: "var(--error)", icon: XCircle },
  release: { color: "var(--success)", icon: ArrowUpCircle },
};

// Dismissals are stored per user on the server. Seen state (which only
// drives the unread dot) is a per-browser convenience, so storage failures
// (private mode, blocked site data) just mean everything shows as new.
function readIds(key: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : []
    );
  } catch {
    return new Set();
  }
}

function writeIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AnnouncementsBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/announcements")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { announcements?: Announcement[] } | null) => {
          if (cancelled || !data) return;
          setSeen(readIds(SEEN_KEY));
          setAnnouncements(data.announcements ?? []);
        })
        // Announcements are optional; never surface fetch errors.
        .catch(() => {});

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The server already leaves out dismissed announcements; this hides one
  // immediately while its dismissal is saved, before the next reload.
  const visible = announcements.filter((a) => !dismissed.has(a.id));
  const unreadCount = visible.filter((a) => !seen.has(a.id)).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      const updated = new Set(seen);
      for (const a of visible) updated.add(a.id);
      setSeen(updated);
      writeIds(SEEN_KEY, updated);
    }
  };

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    const restore = () =>
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    fetch("/api/announcements/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then((res) => {
        // 404 means it's no longer in the feed, so it stays hidden anyway.
        if (!res.ok && res.status !== 404) restore();
      })
      .catch(restore);
  };

  return (
    // The panel positions against the nearest positioned ancestor (the
    // sidebar header) so it has room to open on narrow drawers.
    <div ref={rootRef} className="flex">
      <button
        type="button"
        onClick={toggle}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative bg-transparent border-none cursor-pointer text-(--text-muted) p-1 rounded-md flex items-center justify-center hover:text-foreground"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-1.75 h-1.75 rounded-full bg-(--error) ring-2 ring-(--bg-surface)" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute left-3 top-full mt-1 z-70 w-[min(18rem,calc(100vw-2rem))] bg-(--bg-card) border border-(--border) rounded-lg shadow-xl overflow-hidden"
        >
          <div className="px-3.5 py-2.5 border-b border-(--border) text-[12px] font-semibold text-foreground">
            Notifications
          </div>
          {visible.length === 0 ? (
            <div className="px-3.5 py-6 text-center text-[12px] text-(--text-dim)">
              No notifications
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto m-0 p-0 list-none">
              {visible.map((a) => {
                const { color, icon: Icon } = TYPE_STYLES[a.type];
                return (
                  <li
                    key={a.id}
                    className="flex gap-2.5 px-3.5 py-3 border-b border-(--border) last:border-b-0"
                  >
                    <Icon
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-foreground wrap-break-word">
                        {a.title}
                      </div>
                      <p className="text-[11.5px] text-(--text-muted) mt-0.5 mb-0 whitespace-pre-line wrap-break-word">
                        {a.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10.5px] text-(--text-dim)">
                        {a.releaseVersion && (
                          <span className="font-semibold" style={{ color }}>
                            v{a.releaseVersion.replace(/^v/, "")}
                          </span>
                        )}
                        <span>{formatDate(a.publishedAt)}</span>
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-(--accent) no-underline hover:underline"
                          >
                            Learn more
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                    {a.dismissible && (
                      <button
                        type="button"
                        onClick={() => dismiss(a.id)}
                        aria-label={`Dismiss ${a.title}`}
                        className="self-start bg-transparent border-none cursor-pointer text-(--text-dim) p-0.5 rounded flex hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
