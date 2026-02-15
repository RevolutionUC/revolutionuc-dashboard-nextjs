"use client";

type EvalData = {
  scores: number[];
  relevance: number;
  borda: number;
};

type Judge = {
  id: string;
  name: string;
  judgeGroupId: number | null;
};

type Project = {
  id: string;
  name: string;
};

type ProjectEvalMap = Map<string, Map<string, EvalData>>;
type ProjectAssignedJudgesMap = Map<string, Set<string>>;

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function formatZScore(z: number): string {
  return z.toFixed(2);
}

export function ScoresTable({
  projectsList,
  judgesList,
  projectEvalMap,
  projectAssignedJudgesMap,
}: {
  projectsList: Project[];
  judgesList: Judge[];
  projectEvalMap: ProjectEvalMap;
  projectAssignedJudgesMap: ProjectAssignedJudgesMap;
}) {
  const judgeScores: Record<string, number[][]> = {};

  for (const judge of judgesList) {
    judgeScores[judge.id] = [[], [], []];
  }

  for (const [, evals] of projectEvalMap) {
    for (const judge of judgesList) {
      const evalData = evals.get(judge.id);
      if (evalData?.scores) {
        for (let i = 0; i < 3; i++) {
          const score = evalData.scores[i];
          if (score !== undefined) {
            judgeScores[judge.id][i].push(score);
          }
        }
      }
    }
  }

  const judgeZScoreMeans: Record<string, number[]> = {};
  for (const judge of judgesList) {
    judgeZScoreMeans[judge.id] = [];
    for (let i = 0; i < 3; i++) {
      const scores = judgeScores[judge.id][i];
      const mean = calculateMean(scores);
      const stdDev = calculateStdDev(scores, mean);
      judgeZScoreMeans[judge.id].push(stdDev);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Project</th>
            <th className="pb-2 font-medium">score1</th>
            <th className="pb-2 font-medium">zScore1</th>
            <th className="pb-2 font-medium">score2</th>
            <th className="pb-2 font-medium">zScore2</th>
            <th className="pb-2 font-medium">score3</th>
            <th className="pb-2 font-medium">zScore3</th>
            <th className="pb-2 font-medium">avg raw score</th>
            <th className="pb-2 font-medium">avg zscore</th>
          </tr>
        </thead>
        <tbody>
          {projectsList.map((project) => {
            const evals = projectEvalMap.get(project.id);
            const assignedJudgeIds = projectAssignedJudgesMap.get(project.id);
            const score1: number[] = [];
            const score2: number[] = [];
            const score3: number[] = [];
            const zScore1: number[] = [];
            const zScore2: number[] = [];
            const zScore3: number[] = [];

            if (assignedJudgeIds) {
              for (const judgeId of assignedJudgeIds) {
                const judge = judgesList.find((j) => j.id === judgeId);
                if (!judge) continue;

                const evalData = evals?.get(judge.id);
                const scores = evalData?.scores;

                for (let i = 0; i < 3; i++) {
                  const score = scores?.[i];
                  const stdDev = judgeZScoreMeans[judge.id]?.[i] ?? 0;

                  if (score !== undefined) {
                    const mean = calculateMean(judgeScores[judge.id][i]);
                    const zScore = calculateZScore(score, mean, stdDev);

                    if (i === 0) {
                      score1.push(score);
                      zScore1.push(zScore);
                    } else if (i === 1) {
                      score2.push(score);
                      zScore2.push(zScore);
                    } else if (i === 2) {
                      score3.push(score);
                      zScore3.push(zScore);
                    }
                  }
                }
              }
            }

            const avgRawScore =
              score1.length > 0 || score2.length > 0 || score3.length > 0
                ? calculateMean([...score1, ...score2, ...score3])
                : 0;
            const avgZScore =
              zScore1.length > 0 || zScore2.length > 0 || zScore3.length > 0
                ? calculateMean([...zScore1, ...zScore2, ...zScore3])
                : 0;

            const formatScoreList = (arr: number[]) =>
              arr.length > 0 ? arr.join(" ") : "-";
            const formatZScoreList = (arr: number[]) =>
              arr.length > 0 ? arr.map(formatZScore).join(" ") : "-";

            return (
              <tr key={project.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{project.name}</td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score1)}{" "}
                  {score1.length > 0 && (
                    <span className="text-muted-foreground">
                      ({calculateMean(score1).toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore1)}{" "}
                  {zScore1.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(calculateMean(zScore1))})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score2)}{" "}
                  {score2.length > 0 && (
                    <span className="text-muted-foreground">
                      ({calculateMean(score2).toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore2)}{" "}
                  {zScore2.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(calculateMean(zScore2))})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score3)}{" "}
                  {score3.length > 0 && (
                    <span className="text-muted-foreground">
                      ({calculateMean(score3).toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore3)}{" "}
                  {zScore3.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(calculateMean(zScore3))})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono font-semibold">
                  {avgRawScore > 0 ? avgRawScore.toFixed(1) : "-"}
                </td>
                <td className="py-2 pr-4 font-mono font-semibold">
                  {avgZScore !== 0 ? formatZScore(avgZScore) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
