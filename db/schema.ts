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
  phone: text("phone").notNull().unique(), // digits only; the player's access code
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eventDate: timestamp("event_date"),
  status: tournamentStatus("status").default("SETUP").notNull(),
  gamesCount: integer("games_count").default(5).notNull(),
  rotationMode: rotationMode("rotation_mode").default("RANDOM").notNull(),
  randomRoundsFirst: integer("random_rounds_first").default(2).notNull(), // Swiss only
  teamsEnabled: boolean("teams_enabled").default(false).notNull(),
  teamMinSize: integer("team_min_size").default(6).notNull(),
  teamMaxSize: integer("team_max_size").default(10).notNull(),
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

// Admin's private "don't seat these two together" list (as partners or opponents).
export const exclusions = pgTable("exclusions", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  entryAId: integer("entry_a_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  entryBId: integer("entry_b_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("exclusions_pair").on(t.tournamentId, t.entryAId, t.entryBId)]);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  isOwner: boolean("is_owner").default(false).notNull(),
  playerId: integer("player_id").unique().references(() => players.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
