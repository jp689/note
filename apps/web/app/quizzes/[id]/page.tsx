import { QuizRunner } from "../../../components/quiz-runner";
import { SectionCard } from "../../../components/section-card";
import { getQuiz } from "../../../lib/api";

export default async function QuizPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getQuiz(params.id);

  return (
    <div className="space-y-8">
      <SectionCard title="在线测评" eyebrow="Quiz Session">
        <div className="rounded-[24px] bg-white/75 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">测评编号: {session.id}</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                按文档知识点自动组卷，当前覆盖客观题与简答题混合模式。
              </p>
            </div>
            <div className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-saffron">
              {session.questions.length} 题
            </div>
          </div>
        </div>
      </SectionCard>

      <QuizRunner quiz={session} />
    </div>
  );
}

