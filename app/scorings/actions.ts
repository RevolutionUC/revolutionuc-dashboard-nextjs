"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  assignments,
  categories,
  evaluations,
  judgeGroups,
  judges,
} from "@/lib/db/schema";

export async function generateRandomScores() {
  const allAssignments = await db.select().from(assignments);
  const allJudges = await db.select().from(judges);
  const allJudgeGroups = await db.select().from(judgeGroups);
  const allCategories = await db.select().from(categories);

  const judgeGroupToJudges = new Map<number, typeof allJudges>();
  for (const judge of allJudges) {
    if (judge.judgeGroupId === null) continue;
    if (!judgeGroupToJudges.has(judge.judgeGroupId)) {
      judgeGroupToJudges.set(judge.judgeGroupId, []);
    }
    judgeGroupToJudges.get(judge.judgeGroupId)!.push(judge);
  }

  const defaultCategoryId = allCategories[0]?.id ?? "general";

  for (const assignment of allAssignments) {
    const judgesInGroup = judgeGroupToJudges.get(assignment.judgeGroupId);
    if (!judgesInGroup) continue;

    for (const judge of judgesInGroup) {
      const existingEval = await db
        .select()
        .from(evaluations)
        .where(
          and(
            eq(evaluations.judgeId, judge.id),
            eq(evaluations.projectId, assignment.projectId),
          ),
        )
        .limit(1);

      const score1 = Math.floor(Math.random() * 5) + 1;
      const score2 = Math.floor(Math.random() * 5) + 1;
      const score3 = Math.floor(Math.random() * 5) + 1;
      const relevance = Math.floor(Math.random() * 5) + 1;

      if (existingEval.length > 0) {
        await db
          .update(evaluations)
          .set({
            scores: [score1, score2, score3],
            categoryRelevance: relevance,
          })
          .where(
            and(
              eq(evaluations.judgeId, judge.id),
              eq(evaluations.projectId, assignment.projectId),
            ),
          );
      } else {
        await db.insert(evaluations).values({
          judgeId: judge.id,
          projectId: assignment.projectId,
          categoryId: defaultCategoryId,
          scores: [score1, score2, score3],
          categoryRelevance: relevance,
          bordaScore: 0,
        });
      }
    }
  }

  revalidatePath("/scorings");
}
