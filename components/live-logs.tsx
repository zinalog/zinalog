"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Fullscreen, Maximize2, Minimize2, Shrink } from "lucide-react";
import LevelBadge from "./level-badge";
import type { Log } from "@/lib/db";

function formatTime(dt: string): string {
  const d = new Date(dt + (dt.endsWith("Z") ? "" : "Z"));
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

interface LiveLogsProps {
  className?: string;
  // Controlled mode: caller manages the SSE and passes data in
  logs?: Log[];
  connected?: boolean;
}

export default function LiveLogs({
  className = "",
  logs: externalLogs,
  connected: externalConnected,
}: LiveLogsProps) {
  const controlled = externalLogs !== undefined;

  const [internalLogs, setInternalLogs] = useState<Log[]>([]);
  const [internalConnected, setInternalConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // "Expanded" overlays the panel on the page; "fullscreen" uses the browser
  // Fullscreen API so the stream can be put up on a dedicated screen.
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Self-managed SSE only used when not in controlled mode
  useEffect(() => {
    if (controlled) return;
    const es = new EventSource("/api/stream");
    es.onopen = () => setInternalConnected(true);
    es.onerror = () => setInternalConnected(false);
    es.onmessage = (event) => {
      const newLogs: Log[] = JSON.parse(event.data);
      setInternalLogs((prev) => [...prev, ...newLogs].slice(-200));
    };
    return () => {
      es.close();
      setInternalConnected(false);
    };
  }, [controlled]);

  const logs = controlled ? externalLogs! : internalLogs;
  const connected = controlled
    ? (externalConnected ?? false)
    : internalConnected;

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Escape closes the expanded overlay (the browser handles it for fullscreen)
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await panelRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can be refused (e.g. inside an iframe); fall back to the overlay
      setExpanded(true);
    }
  }, []);

  // Auto-scroll to top (newest logs prepended)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <>
      {expanded && !fullscreen && (
        <>
          {/* Holds the panel's slot so the page layout doesn't jump */}
          <div className={`rounded-lg ${className}`} aria-hidden />
          <div
            className="fixed inset-0 z-190 bg-black/60"
            onClick={() => setExpanded(false)}
            aria-hidden
          />
        </>
      )}
      <div
        ref={panelRef}
        className={`bg-background border border-(--border) overflow-hidden flex flex-col ${
          fullscreen
            ? "w-screen h-screen rounded-none border-0"
            : expanded
              ? "fixed inset-4 sm:inset-8 z-200 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              : `rounded-lg ${className}`
        }`}
        role={expanded && !fullscreen ? "dialog" : undefined}
        aria-label={expanded && !fullscreen ? "Live stream" : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-(--bg-surface) border-b border-(--border) shrink-0">
          <span className="text-[13px] font-semibold">Live Stream</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.75 h-1.75 rounded-full ${connected ? "bg-(--success) pulse-dot" : "bg-(--text-dim)"}`}
              />
              <span
                className={`text-[11px] ${connected ? "text-(--success)" : "text-(--text-dim)"}`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {!fullscreen && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  title={expanded ? "Collapse (Esc)" : "Expand"}
                  aria-label={
                    expanded ? "Collapse live stream" : "Expand live stream"
                  }
                  className="p-1 rounded text-(--text-dim) hover:text-foreground hover:bg-(--bg-card) cursor-pointer"
                >
                  {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
                aria-label={
                  fullscreen ? "Exit fullscreen" : "Show live stream fullscreen"
                }
                className="p-1 rounded text-(--text-dim) hover:text-foreground hover:bg-(--bg-card) cursor-pointer"
              >
                {fullscreen ? <Shrink size={14} /> : <Fullscreen size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Log stream */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto font-mono py-2 ${
            fullscreen ? "text-[14px]" : "text-[12px]"
          }`}
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-(--text-dim) text-[13px] font-sans">
              Waiting for logs…
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="animate-fade-in flex items-baseline gap-2.5 px-3.5 py-1 border-b border-[rgba(48,54,61,0.4)]"
              >
                <span className="text-(--text-dim) min-w-17.5">
                  {formatTime(log.created_at)}
                </span>
                <LevelBadge level={log.level} size="sm" />
                {log.service && (
                  <span className="text-(--accent) min-w-20 max-w-25 overflow-hidden text-ellipsis whitespace-nowrap">
                    {log.service}
                  </span>
                )}
                <span className="text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  );
}
