-- Fitness domain + AI coach: member profile, body metrics, exercise library, workout plans and
-- logs, meal plans, persistent AI chat, OpenAI usage accounting and churn insights.
--
-- Generated with prisma migrate diff, then the invariants Prisma cannot express were added by
-- hand at the end of the file (CHECK constraints, partial unique index). Purely additive: no
-- existing table or column is changed.
-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('lose_fat', 'build_muscle', 'improve_endurance', 'general_health');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('ai', 'coach');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('chat', 'workout_plan', 'meal_plan', 'progress_report', 'churn_insight');

-- CreateEnum
CREATE TYPE "AiCallStatus" AS ENUM ('success', 'error');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant', 'tool');

-- CreateEnum
CREATE TYPE "ChurnRisk" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "MemberProfile" (
    "member_id" TEXT NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "target_weight_kg" DOUBLE PRECISION,
    "goal" "FitnessGoal" NOT NULL DEFAULT 'general_health',
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'beginner',
    "activity_level" "ActivityLevel" NOT NULL DEFAULT 'moderate',
    "training_days_per_week" INTEGER NOT NULL DEFAULT 3,
    "session_minutes" INTEGER NOT NULL DEFAULT 60,
    "injuries" TEXT,
    "dietary_restrictions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "body_fat_pct" DOUBLE PRECISION,
    "muscle_mass_kg" DOUBLE PRECISION,
    "waist_cm" DOUBLE PRECISION,
    "resting_hr" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscle_group" "MuscleGroup" NOT NULL,
    "equipment" TEXT,
    "difficulty" "ExperienceLevel" NOT NULL,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" "FitnessGoal" NOT NULL,
    "weeks" INTEGER NOT NULL,
    "days_per_week" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'draft',
    "source" "PlanSource" NOT NULL,
    "notes" TEXT,
    "ai_usage_id" TEXT,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlanDay" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "focus" TEXT,

    CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlanExercise" (
    "id" TEXT NOT NULL,
    "plan_day_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "rest_seconds" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "WorkoutPlanExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_day_id" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER,
    "perceived_effort" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLogSet" (
    "id" TEXT NOT NULL,
    "log_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION,

    CONSTRAINT "WorkoutLogSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "target_calories" INTEGER NOT NULL,
    "protein_g" INTEGER NOT NULL,
    "carbs_g" INTEGER NOT NULL,
    "fat_g" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'draft',
    "source" "PlanSource" NOT NULL,
    "notes" TEXT,
    "ai_usage_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanItem" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calories" INTEGER NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "tool_call_id" TEXT,
    "tool_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "member_id" TEXT,
    "staff_id" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "status" "AiCallStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberInsight" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "risk_level" "ChurnRisk" NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "baseline_score" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "outreach_message" TEXT NOT NULL,
    "ai_usage_id" TEXT,
    "staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyMetric_member_id_measured_at_idx" ON "BodyMetric"("member_id", "measured_at");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "WorkoutPlan_member_id_status_idx" ON "WorkoutPlan"("member_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlanDay_plan_id_day_index_key" ON "WorkoutPlanDay"("plan_id", "day_index");

-- CreateIndex
CREATE INDEX "WorkoutPlanExercise_exercise_id_idx" ON "WorkoutPlanExercise"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlanExercise_plan_day_id_position_key" ON "WorkoutPlanExercise"("plan_day_id", "position");

-- CreateIndex
CREATE INDEX "WorkoutLog_member_id_performed_at_idx" ON "WorkoutLog"("member_id", "performed_at");

-- CreateIndex
CREATE INDEX "WorkoutLogSet_exercise_id_idx" ON "WorkoutLogSet"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLogSet_log_id_exercise_id_set_number_key" ON "WorkoutLogSet"("log_id", "exercise_id", "set_number");

-- CreateIndex
CREATE INDEX "MealPlan_member_id_created_at_idx" ON "MealPlan"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "MealPlanItem_meal_plan_id_day_index_idx" ON "MealPlanItem"("meal_plan_id", "day_index");

-- CreateIndex
CREATE INDEX "AiConversation_member_id_updated_at_idx" ON "AiConversation"("member_id", "updated_at");

-- CreateIndex
CREATE INDEX "AiMessage_conversation_id_created_at_idx" ON "AiMessage"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "AiUsageLog_member_id_created_at_idx" ON "AiUsageLog"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "AiUsageLog_feature_created_at_idx" ON "AiUsageLog"("feature", "created_at");

-- CreateIndex
CREATE INDEX "MemberInsight_member_id_created_at_idx" ON "MemberInsight"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "MemberInsight_risk_level_created_at_idx" ON "MemberInsight"("risk_level", "created_at");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMetric" ADD CONSTRAINT "BodyMetric_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_ai_usage_id_fkey" FOREIGN KEY ("ai_usage_id") REFERENCES "AiUsageLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlanDay" ADD CONSTRAINT "WorkoutPlanDay_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "WorkoutPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "WorkoutPlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLogSet" ADD CONSTRAINT "WorkoutLogSet_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLogSet" ADD CONSTRAINT "WorkoutLogSet_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_ai_usage_id_fkey" FOREIGN KEY ("ai_usage_id") REFERENCES "AiUsageLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInsight" ADD CONSTRAINT "MemberInsight_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInsight" ADD CONSTRAINT "MemberInsight_ai_usage_id_fkey" FOREIGN KEY ("ai_usage_id") REFERENCES "AiUsageLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== Invariants (hand-written) =====

ALTER TABLE "MemberProfile"
  ADD CONSTRAINT "MemberProfile_height_range" CHECK ("height_cm" IS NULL OR "height_cm" BETWEEN 100 AND 250),
  ADD CONSTRAINT "MemberProfile_target_weight_range" CHECK ("target_weight_kg" IS NULL OR "target_weight_kg" BETWEEN 30 AND 300),
  ADD CONSTRAINT "MemberProfile_days_range" CHECK ("training_days_per_week" BETWEEN 1 AND 7),
  ADD CONSTRAINT "MemberProfile_minutes_range" CHECK ("session_minutes" BETWEEN 15 AND 240);

ALTER TABLE "BodyMetric"
  ADD CONSTRAINT "BodyMetric_weight_range" CHECK ("weight_kg" BETWEEN 25 AND 350),
  ADD CONSTRAINT "BodyMetric_body_fat_range" CHECK ("body_fat_pct" IS NULL OR "body_fat_pct" BETWEEN 2 AND 75),
  ADD CONSTRAINT "BodyMetric_muscle_positive" CHECK ("muscle_mass_kg" IS NULL OR "muscle_mass_kg" > 0),
  ADD CONSTRAINT "BodyMetric_waist_range" CHECK ("waist_cm" IS NULL OR "waist_cm" BETWEEN 30 AND 250),
  ADD CONSTRAINT "BodyMetric_resting_hr_range" CHECK ("resting_hr" IS NULL OR "resting_hr" BETWEEN 25 AND 220);

ALTER TABLE "WorkoutPlan"
  ADD CONSTRAINT "WorkoutPlan_weeks_range" CHECK ("weeks" BETWEEN 1 AND 52),
  ADD CONSTRAINT "WorkoutPlan_days_range" CHECK ("days_per_week" BETWEEN 1 AND 7),
  ADD CONSTRAINT "WorkoutPlan_active_has_date" CHECK ("status" <> 'active' OR "activated_at" IS NOT NULL);

-- A member follows at most one plan at a time. Activation archives the previous plan in the same
-- transaction; this index makes the database refuse a second active plan even if code is wrong.
CREATE UNIQUE INDEX "WorkoutPlan_one_active_per_member" ON "WorkoutPlan"("member_id") WHERE "status" = 'active';

ALTER TABLE "WorkoutPlanDay"
  ADD CONSTRAINT "WorkoutPlanDay_index_range" CHECK ("day_index" BETWEEN 1 AND 7);

ALTER TABLE "WorkoutPlanExercise"
  ADD CONSTRAINT "WorkoutPlanExercise_position_positive" CHECK ("position" >= 1),
  ADD CONSTRAINT "WorkoutPlanExercise_sets_range" CHECK ("sets" BETWEEN 1 AND 10),
  ADD CONSTRAINT "WorkoutPlanExercise_rest_range" CHECK ("rest_seconds" BETWEEN 0 AND 600);

ALTER TABLE "WorkoutLog"
  ADD CONSTRAINT "WorkoutLog_duration_range" CHECK ("duration_minutes" IS NULL OR "duration_minutes" BETWEEN 1 AND 600),
  ADD CONSTRAINT "WorkoutLog_rpe_range" CHECK ("perceived_effort" IS NULL OR "perceived_effort" BETWEEN 1 AND 10);

ALTER TABLE "WorkoutLogSet"
  ADD CONSTRAINT "WorkoutLogSet_set_number_positive" CHECK ("set_number" >= 1),
  ADD CONSTRAINT "WorkoutLogSet_reps_range" CHECK ("reps" BETWEEN 0 AND 1000),
  ADD CONSTRAINT "WorkoutLogSet_weight_range" CHECK ("weight_kg" IS NULL OR "weight_kg" BETWEEN 0 AND 1000);

ALTER TABLE "MealPlan"
  ADD CONSTRAINT "MealPlan_days_range" CHECK ("days" BETWEEN 1 AND 7),
  ADD CONSTRAINT "MealPlan_targets_positive" CHECK ("target_calories" > 0 AND "protein_g" >= 0 AND "carbs_g" >= 0 AND "fat_g" >= 0);

ALTER TABLE "MealPlanItem"
  ADD CONSTRAINT "MealPlanItem_day_range" CHECK ("day_index" BETWEEN 1 AND 7),
  ADD CONSTRAINT "MealPlanItem_macros_non_negative" CHECK ("calories" >= 0 AND "protein_g" >= 0 AND "carbs_g" >= 0 AND "fat_g" >= 0);

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_tokens_non_negative" CHECK ("prompt_tokens" >= 0 AND "completion_tokens" >= 0 AND "cost_usd" >= 0 AND "latency_ms" >= 0);

ALTER TABLE "MemberInsight"
  ADD CONSTRAINT "MemberInsight_score_range" CHECK ("risk_score" BETWEEN 0 AND 100 AND "baseline_score" BETWEEN 0 AND 100);
