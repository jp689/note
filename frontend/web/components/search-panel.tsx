"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchKnowledge } from "../lib/api";
import { LuminaIcon } from "./lumina-icon";
import type { SearchResult } from "@ai-study-notes/contracts";

export function SearchPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchKnowledge(q);
      setResults(data.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/knowledge?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative hidden w-full max-w-md items-center md:flex" ref={containerRef}>
      <LuminaIcon className="pointer-events-none absolute left-0 text-outline" name="search" />
      <input
        aria-label="搜索知识点"
        className="w-full border-0 border-b border-outline-variant/50 bg-transparent py-2 pl-8 pr-3 text-sm text-on-surface outline-none transition placeholder:text-outline/70 focus:border-primary"
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="搜索知识点、标签或概念"
        ref={inputRef}
        value={query}
      />
      {open && query.trim() && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[360px] rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-2 shadow-panel">
          {loading ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-outline">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-outline">
              没有找到相关结果
            </div>
          ) : (
            <div className="grid gap-1">
              {results.map((result) => (
                <Link
                  className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-container"
                  href={`/documents/${result.node.documentId}`}
                  key={`${result.node.id}-${result.matchType}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LuminaIcon className="text-[16px]" name="description" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{result.node.title}</p>
                    <p className="mt-0.5 truncate text-xs text-outline">{result.documentTitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {Math.round((result.score ?? 0) * 100)}%
                  </span>
                </Link>
              ))}
              <Link
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
                href={`/knowledge?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
              >
                <LuminaIcon className="text-[16px]" name="search" />
                查看全部结果
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
