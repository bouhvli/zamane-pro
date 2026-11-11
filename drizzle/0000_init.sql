CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" bigint,
	"percent" smallint,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_entries_one_value" CHECK (("goal_entries"."amount" is null) <> ("goal_entries"."percent" is null)),
	CONSTRAINT "goal_entries_amount_positive" CHECK ("goal_entries"."amount" is null or "goal_entries"."amount" > 0),
	CONSTRAINT "goal_entries_percent_range" CHECK ("goal_entries"."percent" is null or "goal_entries"."percent" between 0 and 100),
	CONSTRAINT "goal_entries_note_len" CHECK (char_length("goal_entries"."note") <= 4000)
);
--> statement-breakpoint
CREATE TABLE "goal_note_blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"text" text,
	"image" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_note_blocks_kind" CHECK ("goal_note_blocks"."kind" in ('text', 'image')),
	CONSTRAINT "goal_note_blocks_shape" CHECK (("goal_note_blocks"."kind" = 'text' and "goal_note_blocks"."text" is not null and "goal_note_blocks"."image" is null) or ("goal_note_blocks"."kind" = 'image' and "goal_note_blocks"."image" is not null)),
	CONSTRAINT "goal_note_blocks_text_len" CHECK (char_length("goal_note_blocks"."text") <= 10000)
);
--> statement-breakpoint
CREATE TABLE "goal_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_notes_id_space_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_amount" bigint,
	"target_date" date,
	"cover" jsonb,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_id_space_unique" UNIQUE("id","space_id"),
	CONSTRAINT "goals_kind" CHECK ("goals"."kind" in ('money', 'general')),
	CONSTRAINT "goals_title_len" CHECK (char_length("goals"."title") between 1 and 120),
	CONSTRAINT "goals_description_len" CHECK (char_length("goals"."description") <= 4000),
	CONSTRAINT "goals_target_by_kind" CHECK (("goals"."kind" = 'money' and "goals"."target_amount" > 0) or ("goals"."kind" = 'general' and "goals"."target_amount" is null)),
	CONSTRAINT "goals_completed_pair" CHECK (("goals"."completed_at" is null) = ("goals"."completed_by" is null))
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"category" text,
	"category_key" text,
	"price" bigint,
	"notes" text,
	"bought_at" timestamp with time zone,
	"bought_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_items_name_len" CHECK (char_length("shopping_items"."name") between 1 and 120),
	CONSTRAINT "shopping_items_quantity_positive" CHECK ("shopping_items"."quantity" > 0),
	CONSTRAINT "shopping_items_category_len" CHECK (char_length("shopping_items"."category") <= 120),
	CONSTRAINT "shopping_items_notes_len" CHECK (char_length("shopping_items"."notes") <= 4000),
	CONSTRAINT "shopping_items_price_nonneg" CHECK ("shopping_items"."price" is null or "shopping_items"."price" >= 0),
	CONSTRAINT "shopping_items_bought_pair" CHECK (("shopping_items"."bought_at" is null) = ("shopping_items"."bought_by" is null))
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"slot" char(1) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_space_id_user_id_pk" PRIMARY KEY("space_id","user_id"),
	CONSTRAINT "space_members_user_unique" UNIQUE("user_id"),
	CONSTRAINT "space_members_space_slot_unique" UNIQUE("space_id","slot"),
	CONSTRAINT "space_members_slot" CHECK ("space_members"."slot" in ('a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" char(3) NOT NULL,
	"timezone" text NOT NULL,
	"invite_code" text NOT NULL,
	"invite_code_rotated_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "spaces_name_len" CHECK (char_length("spaces"."name") between 1 and 120),
	CONSTRAINT "spaces_currency_iso" CHECK ("spaces"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "spaces_invite_code_format" CHECK ("spaces"."invite_code" ~ '^[2-9A-HJKMNP-Z]{8}$')
);
--> statement-breakpoint
CREATE TABLE "trip_checklist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"group" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_checklist_items_group" CHECK ("trip_checklist_items"."group" in ('packing', 'documents', 'bookings', 'todo')),
	CONSTRAINT "trip_checklist_items_title_len" CHECK (char_length("trip_checklist_items"."title") between 1 and 120),
	CONSTRAINT "trip_checklist_items_done_pair" CHECK (("trip_checklist_items"."done_at" is null) = ("trip_checklist_items"."done_by" is null))
);
--> statement-breakpoint
CREATE TABLE "trip_places" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"area" text,
	"notes" text,
	"url" text,
	"estimated_cost" bigint,
	"must_do" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_places_id_space_unique" UNIQUE("id","space_id"),
	CONSTRAINT "trip_places_type" CHECK ("trip_places"."type" in ('flight', 'transport', 'stay', 'food', 'sight', 'activity', 'other')),
	CONSTRAINT "trip_places_title_len" CHECK (char_length("trip_places"."title") between 1 and 120),
	CONSTRAINT "trip_places_area_len" CHECK (char_length("trip_places"."area") <= 120),
	CONSTRAINT "trip_places_notes_len" CHECK (char_length("trip_places"."notes") <= 4000),
	CONSTRAINT "trip_places_url" CHECK ("trip_places"."url" is null or ("trip_places"."url" ~* '^https?://' and char_length("trip_places"."url") <= 2048)),
	CONSTRAINT "trip_places_cost_nonneg" CHECK ("trip_places"."estimated_cost" is null or "trip_places"."estimated_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trip_plan_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"date" date,
	"start_time" time,
	"end_time" time,
	"location" text,
	"cost" bigint,
	"url" text,
	"notes" text,
	"done_at" timestamp with time zone,
	"done_by" uuid,
	"place_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_plan_entries_place_id_unique" UNIQUE("place_id"),
	CONSTRAINT "trip_plan_entries_type" CHECK ("trip_plan_entries"."type" in ('flight', 'transport', 'stay', 'food', 'sight', 'activity', 'other')),
	CONSTRAINT "trip_plan_entries_title_len" CHECK (char_length("trip_plan_entries"."title") between 1 and 120),
	CONSTRAINT "trip_plan_entries_location_len" CHECK (char_length("trip_plan_entries"."location") <= 120),
	CONSTRAINT "trip_plan_entries_notes_len" CHECK (char_length("trip_plan_entries"."notes") <= 4000),
	CONSTRAINT "trip_plan_entries_url" CHECK ("trip_plan_entries"."url" is null or ("trip_plan_entries"."url" ~* '^https?://' and char_length("trip_plan_entries"."url") <= 2048)),
	CONSTRAINT "trip_plan_entries_cost_nonneg" CHECK ("trip_plan_entries"."cost" is null or "trip_plan_entries"."cost" >= 0),
	CONSTRAINT "trip_plan_entries_done_pair" CHECK (("trip_plan_entries"."done_at" is null) = ("trip_plan_entries"."done_by" is null))
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"title" text NOT NULL,
	"destination" text,
	"start_date" date,
	"end_date" date,
	"budget" bigint,
	"notes" text,
	"cover" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_id_space_unique" UNIQUE("id","space_id"),
	CONSTRAINT "trips_title_len" CHECK (char_length("trips"."title") between 1 and 120),
	CONSTRAINT "trips_destination_len" CHECK (char_length("trips"."destination") <= 120),
	CONSTRAINT "trips_notes_len" CHECK (char_length("trips"."notes") <= 4000),
	CONSTRAINT "trips_budget_nonneg" CHECK ("trips"."budget" is null or "trips"."budget" >= 0),
	CONSTRAINT "trips_dates" CHECK (("trips"."start_date" is null and "trips"."end_date" is null) or ("trips"."start_date" is not null and "trips"."end_date" is not null and "trips"."end_date" >= "trips"."start_date"))
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_display_name_len" CHECK (char_length("user"."display_name") <= 120)
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_goal_fk" FOREIGN KEY ("goal_id","space_id") REFERENCES "public"."goals"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_note_blocks" ADD CONSTRAINT "goal_note_blocks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_note_blocks" ADD CONSTRAINT "goal_note_blocks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_note_blocks" ADD CONSTRAINT "goal_note_blocks_note_fk" FOREIGN KEY ("note_id","space_id") REFERENCES "public"."goal_notes"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_notes" ADD CONSTRAINT "goal_notes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_notes" ADD CONSTRAINT "goal_notes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_notes" ADD CONSTRAINT "goal_notes_goal_fk" FOREIGN KEY ("goal_id","space_id") REFERENCES "public"."goals"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_bought_by_user_id_fk" FOREIGN KEY ("bought_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_done_by_user_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_trip_fk" FOREIGN KEY ("trip_id","space_id") REFERENCES "public"."trips"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_trip_fk" FOREIGN KEY ("trip_id","space_id") REFERENCES "public"."trips"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plan_entries" ADD CONSTRAINT "trip_plan_entries_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plan_entries" ADD CONSTRAINT "trip_plan_entries_done_by_user_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plan_entries" ADD CONSTRAINT "trip_plan_entries_place_id_trip_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."trip_places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plan_entries" ADD CONSTRAINT "trip_plan_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_plan_entries" ADD CONSTRAINT "trip_plan_entries_trip_fk" FOREIGN KEY ("trip_id","space_id") REFERENCES "public"."trips"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goal_entries_space_id_idx" ON "goal_entries" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "goal_entries_goal_created_idx" ON "goal_entries" USING btree ("goal_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_note_blocks_note_position_unique" ON "goal_note_blocks" USING btree ("note_id","position");--> statement-breakpoint
CREATE INDEX "goal_note_blocks_space_id_idx" ON "goal_note_blocks" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "goal_notes_space_id_idx" ON "goal_notes" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "goal_notes_goal_id_idx" ON "goal_notes" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_space_id_idx" ON "goals" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shopping_items_space_id_idx" ON "shopping_items" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "shopping_items_space_bought_idx" ON "shopping_items" USING btree ("space_id","bought_at");--> statement-breakpoint
CREATE INDEX "shopping_items_space_category_idx" ON "shopping_items" USING btree ("space_id","category_key");--> statement-breakpoint
CREATE INDEX "trip_checklist_items_space_id_idx" ON "trip_checklist_items" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "trip_checklist_items_trip_group_pos_idx" ON "trip_checklist_items" USING btree ("trip_id","group","position");--> statement-breakpoint
CREATE INDEX "trip_places_space_id_idx" ON "trip_places" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "trip_places_trip_id_idx" ON "trip_places" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_plan_entries_space_id_idx" ON "trip_plan_entries" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "trip_plan_entries_trip_date_idx" ON "trip_plan_entries" USING btree ("trip_id","date","start_time");--> statement-breakpoint
CREATE INDEX "trips_space_id_idx" ON "trips" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");