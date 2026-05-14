"use client";

import { QuizSession } from "@ai-study-notes/contracts";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { submitQuiz } from "../lib/api";

type AnswerMap = Record<string, string>;

function normalizeAnswer(answer: string | string[]) {
  return Array.isArray(answer) ? answer.join("|") : answer;
}

export function QuizRunner({ quiz }: { quiz: QuizSession }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [serverScore, setServerScore] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState("");

  const scored = useMemo(() => {
    const objectiveQuestions = quiz.questions.filter(
      (question) => question.type !== "short_answer"
    );
    const objectiveCorrect = objectiveQuestions.filter(
      (question) => answers[question.id] === normalizeAnswer(question.answer)
    ).length;
    const autoScore = objectiveQuestions.length
      ? Math.round((objectiveCorrect / objectiveQuestions.length) * 100)
      : 0;

    return {
      objectiveCorrect,
      objectiveTotal: objectiveQuestions.length,
      autoScore
    };
  }, [answers, quiz.questions]);

  async function handleSubmit() {
    const unanswered = quiz.questions.filter((question) => !answers[question.id]?.trim());
    if (unanswered.length > 0) {
      setError(`还有 ${unanswered.length} 道题未作答`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await submitQuiz(quiz.id, {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          answer: answers[question.id]
        }))
      });
      setServerScore(response.score);
      setAttemptId(response.attemptId);
      setSubmitted(true);
      router.push(`/reports/${response.attemptId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "测评提交失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {quiz.questions.map((question, index) => (
        <div className="panel rounded-[24px] p-6" key={question.id}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-saffron">
              {question.type}
            </span>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
              {question.difficulty}
            </span>
          </div>

          <p className="text-lg font-semibold text-ink">
            {index + 1}. {question.stem}
          </p>

          {question.options ? (
            <div className="mt-4 grid gap-3">
              {question.options.map((option) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-sm text-ink/80"
                  key={option}
                >
                  <input
                    checked={answers[question.id] === option}
                    className="h-4 w-4 accent-saffron"
                    name={question.id}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [question.id]: option }))
                    }
                    type="radio"
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="mt-4 min-h-36 w-full rounded-[24px] border border-ink/10 bg-white/70 px-4 py-4 text-sm text-ink outline-none transition focus:border-saffron/50"
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: event.target.value
                }))
              }
              placeholder="输入你的作答，提交后由 AI rubric 进行评价。"
              value={answers[question.id] ?? ""}
            />
          )}

          {submitted ? (
            <div className="mt-4 rounded-2xl bg-mist/60 px-4 py-3 text-sm leading-6 text-ink/80">
              <p className="font-medium text-ink">解析</p>
              <p>{question.explanation}</p>
            </div>
          ) : null}
        </div>
      ))}

      <div className="panel rounded-[28px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ink/45">测评提交</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">完成后生成弱点反馈</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              客观题会即时评分，简答题会进入 AI rubric 评分流程，并同步更新复习队列。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? "提交中..." : "提交本次测评"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {submitted ? (
          <div className="mt-5 rounded-[24px] bg-white/75 p-5">
            <p className="text-sm font-medium text-ink">
              最终得分：{serverScore ?? scored.autoScore} / 100
            </p>
            <p className="mt-2 text-sm text-ink/70">
              已命中 {scored.objectiveCorrect} / {scored.objectiveTotal} 道客观题，报告编号：
              {attemptId}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
