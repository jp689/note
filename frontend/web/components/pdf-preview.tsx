"use client";

import { useEffect, useState } from "react";
import { getDocumentDownloadUrl } from "../lib/api";
import { LuminaIcon } from "./lumina-icon";

interface PdfPreviewProps {
  documentId: string;
  documentTitle: string;
}

export function PdfPreview({ documentId, documentTitle }: PdfPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const pdfUrl = getDocumentDownloadUrl(documentId);

  useEffect(() => {
    let revokedUrl: string | null = null;
    const controller = new AbortController();
    setIsLoading(true);
    setHasError(false);
    setObjectUrl(null);

    async function loadPdf() {
      try {
        const token = localStorage.getItem("ai-study-token");
        const headers = new Headers();
        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
        const response = await fetch(pdfUrl, {
          headers,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("PDF request failed");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setObjectUrl(url);
      } catch (error) {
        if (!controller.signal.aborted) {
          setHasError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();
    return () => {
      controller.abort();
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [pdfUrl]);

  function handleDownload() {
    if (!objectUrl) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${documentTitle}.pdf`;
    anchor.click();
  }

  function handleOpenWindow() {
    if (objectUrl) {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10 text-error">
            <LuminaIcon className="text-[22px]" name="picture_as_pdf" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{documentTitle}</p>
            <p className="text-xs text-on-surface-variant">PDF 文档预览</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            <LuminaIcon className="text-[18px]" name={isExpanded ? "fullscreen_exit" : "fullscreen"} />
            {isExpanded ? "收起" : "展开"}
          </button>
          <button
            className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
            onClick={handleOpenWindow}
            disabled={!objectUrl}
            type="button"
          >
            <LuminaIcon className="text-[18px]" name="open_in_new" />
            新窗口
          </button>
          <button
            className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!objectUrl}
            onClick={handleDownload}
            type="button"
          >
            <LuminaIcon className="text-[18px]" name="download" />
            下载
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest transition-all duration-300 ${
          isExpanded ? "h-[80vh]" : "h-[500px]"
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-lowest">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-on-surface-variant">正在加载 PDF...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-lowest">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
                <LuminaIcon className="text-[32px]" name="error_outline" />
              </div>
              <div>
                <p className="font-semibold text-ink">PDF 加载失败</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  请尝试下载后使用本地 PDF 阅读器查看
                </p>
              </div>
              <button
                className="ui-button-primary"
                disabled={!objectUrl}
                onClick={handleDownload}
                type="button"
              >
                下载 PDF
              </button>
            </div>
          </div>
        )}

        {objectUrl ? (
        <iframe
          className="h-full w-full"
          src={`${objectUrl}#toolbar=0&navpanes=0`}
          title={`PDF 预览 - ${documentTitle}`}
        />
        ) : null}
      </div>

      <p className="text-xs text-on-surface-variant">
        提示：如果 PDF 无法正常显示，请点击上方「下载」按钮保存到本地查看。
      </p>
    </div>
  );
}
