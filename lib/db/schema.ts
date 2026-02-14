import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { PARTICIPANT_STATUSES } from "@/lib/participant-status";

// Event visibility enum for day-of schedule
export const scheduleVisibility = pgEnum("schedule_visibility", [
  "internal",
  "public",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================
// RevolutionUC Application Tables
// ============================================

export const participantStatus = pgEnum("participant_status", [
  ...PARTICIPANT_STATUSES,
]);

export const participants = pgTable(
  "participants",
  {
    user_id: uuid("user_id").primaryKey().defaultRandom(),
    // userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    age: integer("age").notNull(),
    gender: text("gender").notNull(),
    school: text("school").notNull(),
    // graduationYear: integer("graduation_year").notNull(),
    levelOfStudy: text("level_of_study").notNull(),
    country: text("country").notNull(),
    major: text("major").notNull(),
    dietRestrictions: text("diet_restrictions"),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    shirtSize: text("shirt_size").notNull(),
    hackathons: text("hackathons").notNull(),
    raceEthnicity: text("race_ethnicity").array(),
    referralSource: text("referral_source").array(),
    resumeUrl: text("resume_url"),
    qrBase64: text("qr_base64"),
    status: participantStatus("status").notNull().default("REGISTERED"),
    checkedIn: boolean("checked_in").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participants_email_idx").on(table.email),
    index("participants_status_idx").on(table.status),
    index("participants_userId_idx").on(table.user_id),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    eventType: text("event_type").notNull(), // CHECKIN, WORKSHOP, FOOD, etc.
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: text("location"),
    capacity: integer("capacity"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("events_type_idx").on(table.eventType)],
);

// Day-of Schedule Table
export const dayOfSchedule = pgTable(
  "day_of_schedule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: text("location"),
    capacity: integer("capacity"),
    visibility: scheduleVisibility("visibility").notNull().default("internal"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("day_of_schedule_visibility_idx").on(table.visibility)],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    // unique index for evernts registration table
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("participant_id")
      .notNull()
      .references(() => participants.user_id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("event_registrations_participant_idx").on(table.user_id),
    index("event_registrations_event_idx").on(table.eventId),
  ],
);

// ============================================
// Judge and Category Tables
// ============================================

export const categoryType = pgEnum("category_type", [
  "Sponsor",
  "Inhouse",
  "General",
  "MLH",
]);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: categoryType("type").notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("categories_type_idx").on(table.type)],
);

export const judgeGroups = pgTable(
  "judge_groups",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("judge_groups_category_idx").on(table.categoryId),
    index("judge_groups_name_idx").on(table.name),
  ],
);

export const judges = pgTable(
  "judges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    judgeGroupId: integer("judge_group_id").references(() => judgeGroups.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("judges_category_idx").on(table.categoryId),
    index("judges_group_idx").on(table.judgeGroupId),
  ],
);

// ============================================
// Project Tables
// ============================================

export const projectStatus = pgEnum("project_status", [
  "created",
  "disqualified",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("created"),
    url: text("url"),
    location: text("location").notNull(),
    location2: text("location2").notNull(),
    disqualifyReason: text("disqualify_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_status_idx").on(table.status),
    index("projects_location_idx").on(table.location),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.categoryId] }),
    index("submissions_project_idx").on(table.projectId),
    index("submissions_category_idx").on(table.categoryId),
  ],
);

// ============================================
// Assignment Tables (Project to Judge Group)
// ============================================

export const assignments = pgTable(
  "assignments",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    judgeGroupId: integer("judge_group_id")
      .notNull()
      .references(() => judgeGroups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.judgeGroupId, table.projectId] }),
    index("assignments_project_idx").on(table.projectId),
    index("assignments_judge_group_idx").on(table.judgeGroupId),
  ],
);
