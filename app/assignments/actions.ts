"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  assignments,
  categories,
  judgeGroups,
  judges,
  submissions,
} from "@/lib/db/schema";

const MINIMUM_JUDGES_PER_PROJECT = 6;

const SUGGESTED_JUDGE_GROUP_COUNT_PER_SUBMISSION_BASED_ON_CATEGORY_TYPE = {
  General: 1,
  Inhouse: 2,
  Sponsor: 1,
  MLH: 0,
} as const;

// Rotating queue to evenly distribute assignments
class RotatingQueue<T> {
  private _items: T[];
  private index = 0;

  constructor(items: T[]) {
    this._items = [...items];
  }

  get length() {
    return this._items.length;
  }

  get items(): T[] {
    return this._items;
  }

  getNext(): T {
    const item = this._items[this.index];
    this.index = (this.index + 1) % this._items.length;
    return item;
  }
}

interface JudgeGroupWithCount {
  id: number;
  categoryId: string;
  judgeCount: number;
}

interface AssignmentToInsert {
  projectId: string;
  judgeGroupId: number;
}

export async function assignSubmissionsToJudgeGroups() {
  try {
    // Find General category ID
    const generalCategory = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.type, "General"))
      .limit(1);

    if (generalCategory.length === 0) {
      return {
        success: false,
        error:
          "General category not found. Please create a General category first.",
      };
    }

    const generalCategoryId = generalCategory[0].id;

    // Preconditions: Check minimum General judges
    const generalJudgesCount = await db
      .select({ count: count() })
      .from(judges)
      .where(eq(judges.categoryId, generalCategoryId));

    const countGeneralJudges = generalJudgesCount[0]?.count || 0;

    if (countGeneralJudges < MINIMUM_JUDGES_PER_PROJECT) {
      return {
        success: false,
        error: `There must be at least ${MINIMUM_JUDGES_PER_PROJECT} General judges. Currently have ${countGeneralJudges}.`,
      };
    }

    // Delete existing assignments
    await db.delete(assignments);

    // Fetch all submissions with category info
    const allSubmissions = await db
      .select({
        projectId: submissions.projectId,
        categoryId: submissions.categoryId,
        categoryType: categories.type,
      })
      .from(submissions)
      .innerJoin(categories, eq(submissions.categoryId, categories.id));

    // Fetch all judge groups with judge counts
    const judgeGroupsWithCounts = await db
      .select({
        id: judgeGroups.id,
        categoryId: judgeGroups.categoryId,
        judgeCount: count(judges.id),
      })
      .from(judgeGroups)
      .leftJoin(judges, eq(judgeGroups.id, judges.judgeGroupId))
      .groupBy(judgeGroups.id, judgeGroups.categoryId);

    if (judgeGroupsWithCounts.length === 0) {
      return {
        success: false,
        error:
          "Need judge groups before assigning projects. Please create judge groups first.",
      };
    }

    // Create rotating queues for each category
    const groupsQueueByCategory = judgeGroupsWithCounts.reduce((acc, group) => {
      if (!acc.has(group.categoryId)) {
        acc.set(group.categoryId, new RotatingQueue<JudgeGroupWithCount>([]));
      }
      acc.get(group.categoryId)!.items.push(group);
      return acc;
    }, new Map<string, RotatingQueue<JudgeGroupWithCount>>());

    // Helper function to determine how many groups per submission
    const determineGroupsCountPerSubmission = (
      categoryType: string,
      categoryId: string,
    ) => {
      const howManyGroupsOfThisCategory =
        groupsQueueByCategory.get(categoryId)?.length || 0;
      const suggestedGroupCount =
        SUGGESTED_JUDGE_GROUP_COUNT_PER_SUBMISSION_BASED_ON_CATEGORY_TYPE[
          categoryType as keyof typeof SUGGESTED_JUDGE_GROUP_COUNT_PER_SUBMISSION_BASED_ON_CATEGORY_TYPE
        ] || 1;
      return Math.min(howManyGroupsOfThisCategory, suggestedGroupCount);
    };

    // Phase 1: Assign submissions to judge groups based on category
    const assignmentList: Array<{
      projectId: string;
      judgeGroup: JudgeGroupWithCount;
    }> = [];

    for (const submission of allSubmissions) {
      const howManyJudgeGroupsToAssign = determineGroupsCountPerSubmission(
        submission.categoryType,
        submission.categoryId,
      );
      const groupsQueue = groupsQueueByCategory.get(submission.categoryId);

      if (!groupsQueue || groupsQueue.length === 0) {
        continue; // Skip if no judge groups for this category
      }

      // Get groups to assign (rotate through available groups)
      for (let i = 0; i < howManyJudgeGroupsToAssign; i++) {
        const group = groupsQueue.getNext();
        assignmentList.push({
          projectId: submission.projectId,
          judgeGroup: group,
        });
      }
    }

    // Phase 2: Assign additional General groups for projects with insufficient judges
    const assignmentsByProject = new Map<
      string,
      Array<{ projectId: string; judgeGroup: JudgeGroupWithCount }>
    >();

    for (const assignment of assignmentList) {
      if (!assignmentsByProject.has(assignment.projectId)) {
        assignmentsByProject.set(assignment.projectId, []);
      }
      assignmentsByProject.get(assignment.projectId)!.push(assignment);
    }

    const generalGroupQueue = groupsQueueByCategory.get(generalCategoryId);

    if (generalGroupQueue) {
      for (const [projectId, projectAssignments] of assignmentsByProject) {
        let howManyJudgesThisProject = projectAssignments.reduce(
          (sum, a) => sum + a.judgeGroup.judgeCount,
          0,
        );
        const alreadyUsedGroupIds = new Set(
          projectAssignments.map((a) => a.judgeGroup.id),
        );

        let safetyCounter = 0;
        while (
          howManyJudgesThisProject < MINIMUM_JUDGES_PER_PROJECT &&
          safetyCounter < 100
        ) {
          const nextGeneralGroup = generalGroupQueue.getNext();
          safetyCounter++;

          // Only use this group if not already assigned to this project
          if (!alreadyUsedGroupIds.has(nextGeneralGroup.id)) {
            assignmentList.push({ projectId, judgeGroup: nextGeneralGroup });
            alreadyUsedGroupIds.add(nextGeneralGroup.id);
            howManyJudgesThisProject += nextGeneralGroup.judgeCount;
          }
        }
      }
    }

    // Post-condition: Check that all projects have sufficient number of judges
    const finalAssignmentsByProject = new Map<string, number>();

    for (const assignment of assignmentList) {
      const currentCount =
        finalAssignmentsByProject.get(assignment.projectId) || 0;
      finalAssignmentsByProject.set(
        assignment.projectId,
        currentCount + assignment.judgeGroup.judgeCount,
      );
    }

    const projectsWithInsufficientJudges: string[] = [];

    for (const [projectId, judgeCount] of finalAssignmentsByProject) {
      if (judgeCount < MINIMUM_JUDGES_PER_PROJECT) {
        projectsWithInsufficientJudges.push(projectId);
      }
    }

    if (projectsWithInsufficientJudges.length > 0) {
      return {
        success: false,
        error: `${projectsWithInsufficientJudges.length} project(s) have insufficient judges. Need at least ${MINIMUM_JUDGES_PER_PROJECT} judges per project.`,
      };
    }

    // Convert to insert format
    const assignmentsToInsert: AssignmentToInsert[] = assignmentList.map(
      (a) => ({
        projectId: a.projectId,
        judgeGroupId: a.judgeGroup.id,
      }),
    );

    // Post-condition: Check for duplicates
    const seen = new Set<string>();
    const duplicates: AssignmentToInsert[] = [];

    for (const entry of assignmentsToInsert) {
      const key = `${entry.judgeGroupId}:${entry.projectId}`;
      if (seen.has(key)) {
        duplicates.push(entry);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length > 0) {
      return {
        success: false,
        error: `Found ${duplicates.length} duplicate assignments.`,
      };
    }

    await db.insert(assignments).values(assignmentsToInsert);
    revalidatePath("/assignments");

    return {
      success: true,
      count: assignmentsToInsert.length,
      projectsAssigned: finalAssignmentsByProject.size,
    };
  } catch (error) {
    console.error("Error assigning submissions to judge groups:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign submissions to judge groups",
    };
  }
}
