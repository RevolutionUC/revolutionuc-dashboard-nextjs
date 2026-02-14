import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { categories, projects, submissions } from "@/lib/db/schema";
import { ImportProjectsModal } from "./import-projects-modal";

interface ProjectWithCategories {
  id: string;
  name: string;
  status: string;
  url: string | null;
  location: string;
  location2: string;
  disqualifyReason: string | null;
  categoryId: string | null;
}

export default async function ProjectsPage() {
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      url: projects.url,
      location: projects.location,
      location2: projects.location2,
      disqualifyReason: projects.disqualifyReason,
      categoryId: submissions.categoryId,
    })
    .from(projects)
    .leftJoin(submissions, eq(projects.id, submissions.projectId))
    .orderBy(projects.name);

  // Group by project
  const projectsMap = projectRows.reduce(
    (acc, row) => {
      if (!acc[row.id]) {
        acc[row.id] = {
          ...row,
          categories: row.categoryId ? [row.categoryId] : [],
        };
      } else if (row.categoryId) {
        acc[row.id].categories.push(row.categoryId);
      }
      return acc;
    },
    {} as Record<
      string,
      Omit<ProjectWithCategories, "categoryId"> & { categories: string[] }
    >,
  );

  const allProjects = Object.values(projectsMap);

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Manage hackathon projects and their status
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Projects ({allProjects.length})</CardTitle>
          <ImportProjectsModal projectsCount={allProjects.length} />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Disqualify Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  allProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            project.status === "created"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {project.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{project.location}</div>
                          <div className="text-muted-foreground">
                            {project.location2}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {project.categories.map((catId) => (
                              <span
                                key={catId}
                                className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800"
                              >
                                {catId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No categories
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.url ? (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Project
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No URL
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.disqualifyReason ? (
                          <span className="text-sm text-red-600">
                            {project.disqualifyReason}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
