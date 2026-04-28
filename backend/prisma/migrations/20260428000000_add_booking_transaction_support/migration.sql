-- Add unique constraint to prevent duplicate bookings (member_id, class_id)
-- Add cascade delete for referential integrity

-- First, add the unique constraint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_member_id_class_id_key" UNIQUE ("member_id", "class_id");

-- Update foreign key constraints to have CASCADE delete
-- Drop existing constraints
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_member_id_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_class_id_fkey";

-- Add new constraints with CASCADE delete
ALTER TABLE "Booking" 
ADD CONSTRAINT "Booking_member_id_fkey" 
FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE;

ALTER TABLE "Booking" 
ADD CONSTRAINT "Booking_class_id_fkey" 
FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE;
