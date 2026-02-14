import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { categories, judgeGroups, judges } from "@/lib/db/schema";

export default async function JudgeAndCategoriesPage() {
  const [allCategories, allJudges, allJudgeGroups] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db
      .select({
        id: judges.id,
        name: judges.name,
        email: judges.email,
        categoryId: judges.categoryId,
        categoryName: categories.name,
        categoryType: categories.type,
        judgeGroupId: judges.judgeGroupId,
        judgeGroupName: judgeGroups.name,
        createdAt: judges.createdAt,
      })
      .from(judges)
      .innerJoin(categories, eq(judges.categoryId, categories.id))
      .leftJoin(judgeGroups, eq(judges.judgeGroupId, judgeGroups.id))
      .orderBy(judges.name),
    db
      .select({
        id: judgeGroups.id,
        name: judgeGroups.name,
        categoryId: judgeGroups.categoryId,
        categoryName: categories.name,
        categoryType: categories.type,
      })
      .from(judgeGroups)
      .innerJoin(categories, eq(judgeGroups.categoryId, categories.id))
      .orderBy(judgeGroups.name),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Judges & Categories</h1>
        <p className="text-sm text-muted-foreground">Manage judges and their assigned categories</p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categories ({allCategories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-30">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-30">Type</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-xs">{category.id}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              category.type === "Sponsor"
                                ? "bg-blue-100 text-blue-800"
                                : category.type === "Inhouse"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {category.type}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Judges ({allJudges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Group</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allJudges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No judges found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allJudges.map((judge) => (
                      <TableRow key={judge.id}>
                        <TableCell className="font-medium">{judge.name}</TableCell>
                        <TableCell className="text-sm">{judge.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <span className="text-sm font-medium">{judge.categoryName}</span>
                            {judge.categoryType && (
                              <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                                  judge.categoryType === "Sponsor"
                                    ? "bg-blue-100 text-blue-800"
                                    : judge.categoryType === "Inhouse"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {judge.categoryType}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {judge.judgeGroupName ? (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                              {judge.judgeGroupName}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not assigned</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Judge Groups ({allJudgeGroups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {allJudgeGroups.length === 0 ? (
              <div className="rounded-md border p-8 text-center text-muted-foreground">
                No judge groups found. Click &quot;Assign Judges to Groups&quot; to create groups.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allJudgeGroups.map((group) => {
                  const groupMembers = allJudges.filter((j) => j.judgeGroupId === group.id);
                  return (
                    <div
                      key={group.id}
                      className="flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm"
                    >
                      <div className="flex flex-col space-y-1.5 p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-mono text-lg font-semibold tracking-tight">
                            {group.name}
                          </h3>
                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                              group.categoryType === "Sponsor"
                                ? "bg-blue-100 text-blue-800"
                                : group.categoryType === "Inhouse"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {group.categoryType}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.categoryName}</p>
                      </div>
                      <div className="flex flex-1 flex-col p-4 pt-2">
                        <div className="space-y-1">
                          {groupMembers.map((member) => (
                            <div
                              key={member.id}
                              className="group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{member.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
