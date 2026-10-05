// Domino Tournament App — database schema (draft v0.1)
// Players, tournaments, teams, rounds, tables/scores, exclusions, admins.
import {
  pgTable, pgEnum, serial, integer, text, boolean, timestamp, customType, uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const tournamentStatus = pgEnum("tournament_status", ["SETUP", "LIVE", "FINISHED"]);
export const rotationMode = pgEnum("rotation_mode", ["RANDOM", "SWISS"]);
export const roundStatus = pgEnum("round_status", ["PENDING", "LIVE", "CLOSED"]);
export const gameStatus = pgEnum("game_status", [
  "NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CONFIRMED", "DISPUTED",
]);

// Permanent player directory shared across tournaments (builds the all-time record).
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").unique(), // international format (+1305…); the player's access code. Null = missing/invalid
  phoneNote: text("phone_note"), // what the uploaded file had when the phone couldn't be read
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // web address: domino.joelbary.com/<slug>
  eventDate: timestamp("event_date"),
  status: tournamentStatus("status").default("SETUP").notNull(),
  gamesCount: integer("games_count").default(5).notNull(),
  rotationMode: rotationMode("rotation_mode").default("RANDOM").notNull(),
  randomRoundsFirst: integer("random_rounds_first").default(2).notNull(), // Swiss only
  teamsEnabled: boolean("teams_enabled").default(false).notNull(),
  teamMinSize: integer("team_min_size").default(6).notNull(),
  teamMaxSize: integer("team_max_size").default(10).notNull(),
  timerEnabled: boolean("timer_enabled").default(true).notNull(),
  roundMinutes: integer("round_minutes").default(30).notNull(),
  resultsPublished: boolean("results_published").default(false).notNull(),
  mplOwnerEntryId: integer("mpl_owner_entry_id"), // the owner's own entry (MPL is relative to him)
  createdByAdminId: integer("created_by_admin_id"), // null = created by the main admin
  // Tournament rules (optional). Without them, players see the general rules.
  rulesText: text("rules_text"),
  rulesFile: bytea("rules_file"),
  rulesFileType: text("rules_file_type"),
  rulesFileName: text("rules_file_name"),
  logo: bytea("logo"),
  logoMimeType: text("logo_mime_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [uniqueIndex("teams_tournament_name").on(t.tournamentId, t.name)]);

// A player's participation in one tournament.
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => players.id),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("entries_tournament_player").on(t.tournamentId, t.playerId)]);

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  timeSlot: text("time_slot"), // e.g. "6:30 to 7:00"
  isSwiss: boolean("is_swiss").default(false).notNull(),
  status: roundStatus("status").default("PENDING").notNull(),
  timerEndsAt: timestamp("timer_ends_at"), // set while the timer runs
  timerRemainingSec: integer("timer_remaining_sec"), // set while paused
}, (t) => [uniqueIndex("rounds_tournament_number").on(t.tournamentId, t.number)]);

// One table in one round: pair A (a1 + a2) vs pair B (b1 + b2). Player columns hold entry ids.
export const gameTables = pgTable("game_tables", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  a1: integer("a1").notNull().references(() => entries.id),
  a2: integer("a2").notNull().references(() => entries.id),
  b1: integer("b1").notNull().references(() => entries.id),
  b2: integer("b2").notNull().references(() => entries.id),
  scoreA: integer("score_a"),
  scoreB: integer("score_b"),
  status: gameStatus("status").default("NOT_STARTED").notNull(),
  submittedBy: integer("submitted_by").references(() => entries.id),
  confirmedBy: integer("confirmed_by").references(() => entries.id),
  enteredByAdmin: boolean("entered_by_admin").default(false).notNull(),
  submittedAt: timestamp("submitted_at"),
  confirmedAt: timestamp("confirmed_at"),
}, (t) => [uniqueIndex("tables_round_number").on(t.roundId, t.number)]);

// Individual hands, when a table keeps score hand by hand.
export const hands = pgTable("hands", {
  id: serial("id").primaryKey(),
  gameTableId: integer("game_table_id").notNull().references(() => gameTables.id, { onDelete: "cascade" }),
  handNumber: integer("hand_number").notNull(),
  pair: text("pair").notNull(), // "A" or "B"
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin's private "don't seat these two together" list (as partners or opponents).
export const exclusions = pgTable("exclusions", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  entryAId: integer("entry_a_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  entryBId: integer("entry_b_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("exclusions_pair").on(t.tournamentId, t.entryAId, t.entryBId)]);

// Co-admins (organizers). The main admin (owner) logs in with ADMIN_PASSWORD and is not stored here.
// An organizer can create tournaments and manages only the ones they created or were added to.
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(), // login name (username or email), stored lower-case
  passwordHash: text("password_hash").notNull(),
  isOwner: boolean("is_owner").default(false).notNull(),
  tournamentId: integer("tournament_id").references(() => tournaments.id, { onDelete: "cascade" }), // unused
  playerId: integer("player_id").unique().references(() => players.id),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Which co-admins can manage which tournament.
export const tournamentAdmins = pgTable("tournament_admins", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("tournament_admins_pair").on(t.tournamentId, t.adminId)]);

// General rules shown in every tournament that doesn't have its own (single row, id = 1).
export const generalRules = pgTable("general_rules", {
  id: integer("id").primaryKey(),
  text: text("text"),
  file: bytea("file"),
  fileType: text("file_type"),
  fileName: text("file_name"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
