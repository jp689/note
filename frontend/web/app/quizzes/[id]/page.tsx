import { QuizRunner } from "../../../components/quiz-runner";
import { SectionCard } from "../../../components/section-card";
import { getQuiz } from "../../../lib/api";
import { getServerToken } from "../../../lib/server-auth";

export default async function QuizPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getQuiz(params.id, getServerToken());

  return (
    <div className="space-y-8">
      <SectionCard title="在线测评" eyebrow="题组">
        <div className="ui-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">测评编号: {session.id}</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                按文档知识点自动组卷，当前覆盖客观题与简答题混合模式。
              </p>
            </div>
            <div className="ui-chip">
              {session.questions.length} 题
            </div>
          </div>
        </div>
      </SectionCard>

      <QuizRunner quiz={session} />
    </div>
  );
}
