"use server";

import { parse } from "csv-parse/sync";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  categories,
  judgeGroups,
  judges,
  projects,
  submissions,
} from "@/lib/db/schema";

const devPostCsvColsMapping = {
  "Project Title": "title",
  "Submission Url": "url",
  "Project Status": "status",
  "Project Created At": "createdAt",
  '"Try it out" Links': "links",
  "Video Demo Link": "videoLink",
  "Opt-In Prizes": "categoriesCsv",
  "Submitter First Name": "submitterFirstName",
  "Submitter Last Name": "submitterLastName",
  "Submitter Email": "submitterEmail",
  "What Is The Table Number You Have Been Assigned By Organizers (Eg. 50)":
    "location",
  "What School Do You Attend? If You Are No Longer In School, What University Did You Attend Most Recently?":
    "school",
  "List All Of The Domain Names Your Team Has Registered With .Tech During This Hackathon.":
    "domains",
} as const;

export type RawDevPostProject = Record<
  keyof typeof devPostCsvColsMapping,
  string
> & {
  [key: string]: string;
};

export type TransformedDevPostProject = Record<
  (typeof devPostCsvColsMapping)[keyof typeof devPostCsvColsMapping],
  string
> & {
  [key: string]: string;
};

/**
 * Parse the DevPost CSV:
 * - Remap column headers to shorter names
 * - Fix DevPost `...` header if there're multiple team members
 */
async function parseDevPostProjectsCsv(
  csvString: string,
): Promise<TransformedDevPostProject[]> {
  const parsedProjects: Array<TransformedDevPostProject> = parse(csvString, {
    relaxColumnCount: true,
    skipEmptyLines: true,
    columns: (headers: string[]) =>
      headers.flatMap((header) => {
        if (header in devPostCsvColsMapping) {
          // Map DevPost long-text header to shorter headers
          return devPostCsvColsMapping[
            header as keyof typeof devPostCsvColsMapping
          ];
        }
        if (header === "...") {
          // DevPost doesn't have headers for team members after 1 (it's just '...'), so we supply the headers manually here
          return [2, 3, 4].flatMap((i) => [
            `Team Member ${i} First Name`,
            `Team Member ${i} Last Name`,
            `Team Member ${i} Email`,
          ]);
        }
        return header;
      }),
  });
  return parsedProjects;
}

interface ImportState {
  success?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
}

export async function importProjectsFromDevpost(
  prevState: ImportState | null,
  formData: FormData,
): Promise<ImportState> {
  try {
    // TODO: Don't allow create/import projects when judging assignments has been made

    const csvFile = formData.get("csvFile") as File;
    if (!csvFile || csvFile.size === 0) {
      return { success: false, error: "File is empty!" };
    }

    const allCategories = await db.select().from(categories);
    const categoryNameToIdMap = allCategories.reduce(
      (acc, category) => ({ ...acc, [category.name]: category.id }),
      {} as Record<string, string>,
    );

    const csvText = await csvFile.text();
    const projectsInput = await parseDevPostProjectsCsv(csvText);

    // Delete all current projects and submissions, and insert new ones obtained from the CSV
    await db.delete(submissions);
    await db.delete(projects);

    let importedCount = 0;
    let skippedCount = 0;

    for (const p of projectsInput) {
      if (p.status.toLowerCase() === "draft") {
        skippedCount++;
        continue; // Skip 'Draft' projects
      }

      const [{ id: insertedProjectId }] = await db
        .insert(projects)
        .values({
          name: p.title,
          location: p.location,
          location2: "",
          url: p.url,
          status: "created",
        })
        .returning({ id: projects.id });

      importedCount++;

      const submittedCategories = p.categoriesCsv.split(",");
      if (!submittedCategories.includes("General")) {
        submittedCategories.push("General");
      }

      const submittedCategoryIds = submittedCategories
        .map((individualCategoryName: string) => {
          const trimmedCategoryName = individualCategoryName.trim();
          if (!trimmedCategoryName) return null;
          if (!(trimmedCategoryName in categoryNameToIdMap)) {
            console.log(
              `Project: '${p.title}': Category '${trimmedCategoryName}' doesn't exist. Skipping submission to this category.`,
            );
            return null;
          }
          return categoryNameToIdMap[trimmedCategoryName];
        })
        .filter((id: string | null): id is string => id !== null);

      if (submittedCategoryIds.length > 0) {
        await db.insert(submissions).values(
          submittedCategoryIds.map((categoryId: string) => ({
            categoryId,
            projectId: insertedProjectId,
          })),
        );
      }
    }

    revalidatePath("/projects");
    return {
      success: true,
      imported: importedCount,
      skipped: skippedCount,
    };
  } catch (error) {
    console.error("Error importing projects:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to import projects",
    };
  }
}
