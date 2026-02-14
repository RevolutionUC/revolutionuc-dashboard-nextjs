"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, judgeGroups, judges } from "@/lib/db/schema";

export type CategoryType = "Sponsor" | "Inhouse" | "General" | "MLH";

interface CreateCategoryInput {
  id: string;
  name: string;
  type: CategoryType;
}

export async function createCategory(data: CreateCategoryInput) {
  try {
    await db.insert(categories).values({
      id: data.id,
      name: data.name,
      type: data.type,
    });

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error creating category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

interface BulkCreateCategoryInput {
  id: string;
  name: string;
  type: CategoryType;
}

export async function createCategoriesBulk(data: BulkCreateCategoryInput[]) {
  try {
    await db.insert(categories).values(data);

    revalidatePath("/judges-and-categories");
    return { success: true, count: data.length };
  } catch (error) {
    console.error("Error creating categories:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create categories",
    };
  }
}

interface UpdateCategoryInput {
  id: string;
  newId?: string;
  name: string;
  type: CategoryType;
}

export async function updateCategory(data: UpdateCategoryInput) {
  try {
    await db
      .update(categories)
      .set({
        id: data.newId ?? data.id,
        name: data.name,
        type: data.type,
      })
      .where(eq(categories.id, data.id));

    revalidatePath("/judges-and-categories");
    return { success: true, newId: data.newId || data.id };
  } catch (error) {
    console.error("Error updating category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

interface CreateJudgeInput {
  name: string;
  email: string;
  categoryId: string;
}

export async function createJudge(data: CreateJudgeInput) {
  try {
    await db.insert(judges).values({
      name: data.name,
      email: data.email,
      categoryId: data.categoryId,
    });

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error creating judge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create judge",
    };
  }
}

interface BulkCreateJudgeInput {
  name: string;
  email: string;
  categoryId: string;
}

export async function createJudgesBulk(data: BulkCreateJudgeInput[]) {
  try {
    await db.insert(judges).values(data);

    revalidatePath("/judges-and-categories");
    return { success: true, count: data.length };
  } catch (error) {
    console.error("Error creating judges:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create judges",
    };
  }
}

export async function updateJudgeAction(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData,
) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const categoryId = formData.get("categoryId") as string;

  if (!id || !name || !email || !categoryId) {
    return { error: "All fields are required" };
  }

  try {
    await db
      .update(judges)
      .set({ name, email, categoryId })
      .where(eq(judges.id, id));

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error updating judge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update judge",
    };
  }
}

interface JudgeWithCategory {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: CategoryType;
  };
}

interface JudgeGroupInfo {
  categoryId: string;
  members: JudgeWithCategory[];
  name: string;
}

export async function assignJudgesToGroups() {
  try {
    const allJudges = await db
      .select({
        id: judges.id,
        name: judges.name,
        email: judges.email,
        categoryId: judges.categoryId,
        category: {
          id: categories.id,
          name: categories.name,
          type: categories.type,
        },
      })
      .from(judges)
      .innerJoin(categories, eq(judges.categoryId, categories.id));

    const allCategories = await db.select({ id: categories.id }).from(categories).orderBy(categories.id);


    // Group judges by category
    const judgesByCategories = allJudges.reduce(
      (acc, judge) => {
        const categoryId = judge.categoryId;
        if (!acc.has(categoryId)) {
          acc.set(categoryId, []);
        }
        acc.get(categoryId)!.push(judge);
        return acc;
      },
      new Map() as Map<string, JudgeWithCategory[]>,
    );

    // Judge group organization logic
    const judgeGroupsToCreate: JudgeGroupInfo[] = [];

    for (const [categoryId, judgesOfThisCategory] of judgesByCategories) {
      const category = judgesOfThisCategory[0].category;

      // If category type is 'Sponsor' or 'MLH', put all judges of that category into one group
      if (category.type === "Sponsor" || category.type === "MLH") {
        judgeGroupsToCreate.push({
          categoryId,
          members: judgesOfThisCategory,
          name: "PLACEHOLDER",
        });
      } else {
        // Chunk into groups of two for other categories
        for (let i = 0; i < judgesOfThisCategory.length; i += 2) {
          judgeGroupsToCreate.push({
            categoryId,
            members: judgesOfThisCategory.slice(i, i + 2),
            name: "",
          });
        }
      }
    }

    // Assign names to groups
    const judgeGroupCountByCategory: Record<string, number> = {};
    const categoryIndex = new Map(allCategories.map((c, index) => [c.id, index]));


    for (const group of judgeGroupsToCreate) {
      const count = (judgeGroupCountByCategory[group.categoryId] || 0) + 1;
      judgeGroupCountByCategory[group.categoryId] = count;

      const firstChar = String.fromCharCode(65 + (categoryIndex.get(group.categoryId) ?? -1));
      const secondChar = count.toString();

      group.name = `${firstChar}${secondChar}`;
    }

    // Delete existing judge groups
    await db.delete(judgeGroups);

    // Create new judge groups and assign judges
    for (const g of judgeGroupsToCreate) {
      const [{ id: createdGroupId }] = await db
        .insert(judgeGroups)
        .values({
          name: g.name,
          categoryId: g.categoryId,
        })
        .returning({ id: judgeGroups.id });

      const judgeIds = g.members.map((j) => j.id);
      await db
        .update(judges)
        .set({ judgeGroupId: createdGroupId })
        .where(inArray(judges.id, judgeIds));
    }

    revalidatePath("/judges-and-categories");
    return {
      success: true,
      groupCount: judgeGroupsToCreate.length,
    };
  } catch (error) {
    console.error("Error assigning judges to groups:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign judges to groups",
    };
  }
}
