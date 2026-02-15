"use client";

import { useMemo, useState } from "react";

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

type SortField =
  | "name"
  | "avgScore1"
  | "avgZScore1"
  | "avgScore2"
  | "avgZScore2"
  | "avgScore3"
  | "avgZScore3"
  | "avgRawScore"
  | "avgZScore";

type SortDirection = "asc" | "desc";

function SortableHeader({
  field,
  label,
  currentSort,
  onSort,
}: {
  field: SortField;
  label: string;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <th
      className="cursor-pointer pb-2 font-medium hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && (currentSort.direction === "asc" ? " ▲" : " ▼")}
    </th>
  );
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
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: "name",
    direction: "asc",
  });

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  type ProjectData = {
    project: Project;
    score1: number[];
    score2: number[];
    score3: number[];
    zScore1: number[];
    zScore2: number[];
    zScore3: number[];
    avgScore1: number;
    avgScore2: number;
    avgScore3: number;
    avgZScore1: number;
    avgZScore2: number;
    avgZScore3: number;
    avgRawScore: number;
    avgZScore: number;
  };

  const projectData = useMemo((): ProjectData[] => {
    const judgeScoresLocal: Record<string, number[][]> = {};
    for (const judge of judgesList) {
      judgeScoresLocal[judge.id] = [[], [], []];
    }

    for (const [, evals] of projectEvalMap) {
      for (const judge of judgesList) {
        const evalData = evals.get(judge.id);
        if (evalData?.scores) {
          for (let i = 0; i < 3; i++) {
            const score = evalData.scores[i];
            if (score !== undefined) {
              judgeScoresLocal[judge.id][i].push(score);
            }
          }
        }
      }
    }

    const judgeZScoreMeansLocal: Record<string, number[]> = {};
    for (const judge of judgesList) {
      judgeZScoreMeansLocal[judge.id] = [];
      for (let i = 0; i < 3; i++) {
        const scores = judgeScoresLocal[judge.id][i];
        const mean = calculateMean(scores);
        const stdDev = calculateStdDev(scores, mean);
        judgeZScoreMeansLocal[judge.id].push(stdDev);
      }
    }

    return projectsList.map((project) => {
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
            const stdDev = judgeZScoreMeansLocal[judge.id]?.[i] ?? 0;

            if (score !== undefined) {
              const mean = calculateMean(judgeScoresLocal[judge.id][i]);
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

      const avgScore1 = score1.length > 0 ? calculateMean(score1) : 0;
      const avgScore2 = score2.length > 0 ? calculateMean(score2) : 0;
      const avgScore3 = score3.length > 0 ? calculateMean(score3) : 0;
      const avgZScore1 = zScore1.length > 0 ? calculateMean(zScore1) : 0;
      const avgZScore2 = zScore2.length > 0 ? calculateMean(zScore2) : 0;
      const avgZScore3 = zScore3.length > 0 ? calculateMean(zScore3) : 0;
      const avgRawScore =
        score1.length > 0 || score2.length > 0 || score3.length > 0
          ? calculateMean([...score1, ...score2, ...score3])
          : 0;
      const avgZScore =
        zScore1.length > 0 || zScore2.length > 0 || zScore3.length > 0
          ? calculateMean([...zScore1, ...zScore2, ...zScore3])
          : 0;

      return {
        project,
        score1,
        score2,
        score3,
        zScore1,
        zScore2,
        zScore3,
        avgScore1,
        avgScore2,
        avgScore3,
        avgZScore1,
        avgZScore2,
        avgZScore3,
        avgRawScore,
        avgZScore,
      };
    });
  }, [projectsList, projectEvalMap, projectAssignedJudgesMap, judgesList]);

  const sortedProjects = useMemo(() => {
    return [...projectData].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sort.field) {
        case "name":
          aVal = a.project.name.toLowerCase();
          bVal = b.project.name.toLowerCase();
          break;
        case "avgScore1":
          aVal = a.avgScore1;
          bVal = b.avgScore1;
          break;
        case "avgZScore1":
          aVal = a.avgZScore1;
          bVal = b.avgZScore1;
          break;
        case "avgScore2":
          aVal = a.avgScore2;
          bVal = b.avgScore2;
          break;
        case "avgZScore2":
          aVal = a.avgZScore2;
          bVal = b.avgZScore2;
          break;
        case "avgScore3":
          aVal = a.avgScore3;
          bVal = b.avgScore3;
          break;
        case "avgZScore3":
          aVal = a.avgZScore3;
          bVal = b.avgZScore3;
          break;
        case "avgRawScore":
          aVal = a.avgRawScore;
          bVal = b.avgRawScore;
          break;
        case "avgZScore":
          aVal = a.avgZScore;
          bVal = b.avgZScore;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sort.direction === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [projectData, sort]);

  const formatScoreList = (arr: number[]) =>
    arr.length > 0 ? arr.join(" ") : "-";
  const formatZScoreList = (arr: number[]) =>
    arr.length > 0 ? arr.map(formatZScore).join(" ") : "-";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Project</th>
            <SortableHeader
              field="avgScore1"
              label="score1"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgZScore1"
              label="zScore1"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgScore2"
              label="score2"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgZScore2"
              label="zScore2"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgScore3"
              label="score3"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgZScore3"
              label="zScore3"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgRawScore"
              label="avg raw score"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              field="avgZScore"
              label="avg zscore"
              currentSort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sortedProjects.map(
            ({
              project,
              score1,
              score2,
              score3,
              zScore1,
              zScore2,
              zScore3,
              avgScore1,
              avgScore2,
              avgScore3,
              avgZScore1,
              avgZScore2,
              avgZScore3,
              avgRawScore,
              avgZScore,
            }) => (
              <tr key={project.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{project.name}</td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score1)}{" "}
                  {score1.length > 0 && (
                    <span className="text-muted-foreground">
                      ({avgScore1.toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore1)}{" "}
                  {zScore1.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(avgZScore1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score2)}{" "}
                  {score2.length > 0 && (
                    <span className="text-muted-foreground">
                      ({avgScore2.toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore2)}{" "}
                  {zScore2.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(avgZScore2)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatScoreList(score3)}{" "}
                  {score3.length > 0 && (
                    <span className="text-muted-foreground">
                      ({avgScore3.toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                  {formatZScoreList(zScore3)}{" "}
                  {zScore3.length > 0 && (
                    <span className="text-foreground">
                      ({formatZScore(avgZScore3)})
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
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
