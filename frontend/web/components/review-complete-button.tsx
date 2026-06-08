"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeReviewItem } from "../lib/api";
import { InlineAlert } from "./ui-states";

export function ReviewCompleteButton({ knowledgeNodeId }: { knowledgeNodeId: string }) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  async function handleComplete() {
    if (isCompleting) {
      return;
    }
    setError("");
    setIsCompleting(true);
    try {
      await completeReviewItem(knowledgeNodeId);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标记失败");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className="ui-button-secondary w-full lg:w-auto"
        disabled={isCompleting}
        onClick={handleComplete}
        type="button"
      >
        {isCompleting ? "正在完成..." : "标记已复习"}
      </button>
      {error ? <InlineAlert message={error} /> : null}
    </div>
  );
}
