
CREATE TABLE IF NOT EXISTS "transportation_groups" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "code" varchar(4) NOT NULL UNIQUE,
  "description" varchar(20) NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" integer,
  "updated_by" integer
);
