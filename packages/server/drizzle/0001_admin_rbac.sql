-- Migration: Admin RBAC (F35)
-- Adds platform admin roles and audit logging

-- Create admin role enum
CREATE TYPE "admin_role" AS ENUM ('super_admin', 'moderator', 'support');

-- Add admin_role column to user table
ALTER TABLE "user" ADD COLUMN "admin_role" "admin_role";

-- Create admin audit log table
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX "admin_audit_log_admin_idx" ON "admin_audit_log" ("admin_id");
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log" ("action");
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" ("created_at");
