import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assignments, judges, projects } from "@/lib/db/schema";
import { GenerateScoresButton } from "./GenerateScoresButton";
import { ScoresTable } from "./ScoresTable";

export const dynamic = "force-dynamic";

export default async function ScoringsPage() {
  const judgesWithEvaluations = await db.query.judges.findMany({
    with: {
      evaluations: {
        with: {
          project: true,
        },
      },
    },
    orderBy: (judges, { asc }) => [asc(judges.name)],
  });

  const judgesList = judgesWithEvaluations.map((j) => ({
    id: j.id,
    name: j.name,
    judgeGroupId: j.judgeGroupId,
  }));

  const projectEvalMap = new Map<
    string,
    Map<string, { scores: number[]; relevance: number; borda: number }>
  >();

  for (const judge of judgesWithEvaluations) {
    for (const eval_ of judge.evaluations) {
      const projectId = eval_.projectId;
      if (!projectEvalMap.has(projectId)) {
        projectEvalMap.set(projectId, new Map());
      }
      projectEvalMap.get(projectId)!.set(judge.id, {
        scores: eval_.scores ?? [],
        relevance: eval_.categoryRelevance,
        borda: eval_.bordaScore,
      });
    }
  }

  const allAssignments = await db.select().from(assignments);
  const projectAssignedJudgesMap = new Map<string, Set<string>>();

  for (const assignment of allAssignments) {
    const assignedJudges = judgesList
      .filter((j) => j.judgeGroupId === assignment.judgeGroupId)
      .map((j) => j.id);

    if (!projectAssignedJudgesMap.has(assignment.projectId)) {
      projectAssignedJudgesMap.set(assignment.projectId, new Set());
    }
    for (const judgeId of assignedJudges) {
      projectAssignedJudgesMap.get(assignment.projectId)!.add(judgeId);
    }
  }

  const projectsList = await db.query.projects.findMany({
    orderBy: (projects, { asc }) => [asc(projects.name)],
  });

  const totalScores = Array.from(projectEvalMap.values()).reduce(
    (sum, evals) => sum + evals.size,
    0,
  );

  return (
    <main className="mx-auto w-full p-6">
      <div className="mb-6 flex items-center">
        <div>
          <h1 className="text-2xl font-semibold">Scorings ({totalScores})</h1>
          <p className="text-sm text-muted-foreground">
            View evaluation scores by project
          </p>
        </div>
        <GenerateScoresButton />
      </div>

      {projectsList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No projects found.
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScoresTable
          projectsList={projectsList}
          judgesList={judgesList}
          projectEvalMap={projectEvalMap}
          projectAssignedJudgesMap={projectAssignedJudgesMap}
        />
      )}
    </main>
  );
}
