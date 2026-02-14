import { count, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  assignments,
  categories,
  judgeGroups,
  judges,
  projects,
} from "@/lib/db/schema";
import { AssignSubmissionsButton } from "./assign-submissions-button";

export default async function AssignmentsPage() {
  // Fetch all assignments with judge group and project info
  const assignmentRows = await db
    .select({
      judgeGroupId: assignments.judgeGroupId,
      projectId: assignments.projectId,
      judgeGroupName: judgeGroups.name,
      categoryId: judgeGroups.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      projectName: projects.name,
    })
    .from(assignments)
    .innerJoin(judgeGroups, eq(assignments.judgeGroupId, judgeGroups.id))
    .innerJoin(categories, eq(judgeGroups.categoryId, categories.id))
    .innerJoin(projects, eq(assignments.projectId, projects.id))
    .orderBy(judgeGroups.name, projects.name);

  // Fetch judge counts for each group
  const judgeCounts = await db
    .select({
      judgeGroupId: judges.judgeGroupId,
      count: count(judges.id),
    })
    .from(judges)
    .groupBy(judges.judgeGroupId);

  const judgeCountByGroup = judgeCounts.reduce(
    (acc, row) => {
      if (row.judgeGroupId !== null) {
        acc[row.judgeGroupId] = row.count;
      }
      return acc;
    },
    {} as Record<number, number>,
  );

  // Group assignments by judge group
  const assignmentsByJudgeGroup = assignmentRows.reduce(
    (acc, row) => {
      if (!acc[row.judgeGroupId]) {
        acc[row.judgeGroupId] = {
          judgeGroupId: row.judgeGroupId,
          judgeGroupName: row.judgeGroupName,
          judgeCount: judgeCountByGroup[row.judgeGroupId] || 0,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categoryType: row.categoryType,
          projects: [],
        };
      }
      acc[row.judgeGroupId].projects.push({
        id: row.projectId,
        name: row.projectName,
      });
      return acc;
    },
    {} as Record<
      number,
      {
        judgeGroupId: number;
        judgeGroupName: string;
        judgeCount: number;
        categoryId: string;
        categoryName: string;
        categoryType: string;
        projects: Array<{ id: string; name: string }>;
      }
    >,
  );

  const judgeGroupsList = Object.values(assignmentsByJudgeGroup);
  const totalAssignments = assignmentRows.length;

  return (
    <main className="mx-auto w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Assignments ({totalAssignments})
        </h1>
        <p className="text-sm text-muted-foreground">
          View project assignments to judge groups
        </p>
      </div>

      <div className="mb-6">
        <AssignSubmissionsButton />
      </div>

      {judgeGroupsList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No assignments found. Create judge groups and assign projects
              first.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {judgeGroupsList.map((judgeGroup) => (
            <Card key={judgeGroup.judgeGroupId} className="flex flex-col">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-sm">
                  {judgeGroup.judgeGroupName} ({judgeGroup.judgeCount} judges)
                </h3>
                <p className="text-xs text-muted-foreground">
                  {judgeGroup.categoryName} ({judgeGroup.projects.length} projects)
                </p>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <div className="space-y-0.5">
                  {judgeGroup.projects.map((project) => (
                    <div
                      key={project.id}
                      className="text-xs leading-relaxed text-foreground hover:text-muted-foreground transition-colors"
                    >
                      {project.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
