"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { SectionCard } from "../../components/section-card";
import {
  processDocument,
  uploadDocumentContent,
  uploadDocumentMetadata
} from "../../lib/api";

const pipeline = [
  "上传 PDF 原文并记录文件元数据",
  "优先提取文本，若内容不足则触发 OCR 回退",
  "将文本按章节与语义切块，生成知识点节点",
  "构建思维导图、题库与首轮学习建议"
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function selectFile(file: File | undefined) {
    setError("");
    setProgress(0);

    if (!file) {
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("请选择 PDF 文件");
      return;
    }

    setSelectedFile(file);
    setStatus("文件已选择，准备上传");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("请先选择一个 PDF 文件");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      setStatus("正在创建文档记录");
      const { document, uploadUrl } = await uploadDocumentMetadata({
        filename: selectedFile.name,
        contentType: selectedFile.type || "application/pdf",
        sizeBytes: selectedFile.size
      });

      setStatus("正在上传 PDF 内容");
      await uploadDocumentContent(uploadUrl, selectedFile, setProgress);

      setStatus("正在触发文档处理");
      await processDocument(document.id);

      setStatus("处理完成，正在打开文档详情");
      router.push(`/documents/${document.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard title="导入你的 PDF 笔记" eyebrow="Upload Center">
        <div
          className="rounded-[28px] border border-dashed border-ink/20 bg-white/65 p-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-ink/45">Drop Zone</p>
          <h3 className="mt-3 text-3xl font-semibold text-ink">拖拽 PDF 或点击上传</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
            支持课程笔记、课堂手写扫描、复习提纲。上传后自动完成 OCR、知识抽取和首轮出题。
          </p>
          <input
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              className="rounded-full bg-saffron px-5 py-3 text-sm font-medium text-white"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              选择文件
            </button>
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploading}
              onClick={handleUpload}
              type="button"
            >
              {isUploading ? "上传处理中..." : "开始上传"}
            </button>
          </div>
          {selectedFile ? (
            <div className="mx-auto mt-6 max-w-xl rounded-[22px] bg-white/80 p-4 text-left">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-ink">{selectedFile.name}</p>
                <p className="text-xs text-ink/55">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full bg-saffron transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-ink/70">{status}</p>
            </div>
          ) : null}
          {error ? (
            <div className="mx-auto mt-5 max-w-xl rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] bg-white/75 p-5">
            <p className="text-sm font-semibold text-ink">推荐输入</p>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              清晰扫描件、目录完整的课件、页码可读的复习笔记，会显著提升知识抽取质量。
            </p>
          </div>
          <div className="rounded-[24px] bg-white/75 p-5">
            <p className="text-sm font-semibold text-ink">验证机制</p>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              每个知识点都保留页码回链，便于用户核验 AI 结构化结果与原始笔记一致性。
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="处理流水线" eyebrow="AI Pipeline">
        <div className="grid gap-4">
          {pipeline.map((step, index) => (
            <div className="rounded-[24px] bg-white/75 p-5" key={step}>
              <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
                Step {index + 1}
              </p>
              <p className="mt-2 text-base font-semibold text-ink">{step}</p>
            </div>
          ))}

          <div className="rounded-[24px] bg-teal-950 p-5 text-paper">
            <p className="text-sm font-semibold">输出物</p>
            <p className="mt-3 text-sm leading-6 text-paper/75">
              文档详情页会同步生成原文视图、结构化笔记、知识点网络、思维导图，以及首轮测评入口。
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
