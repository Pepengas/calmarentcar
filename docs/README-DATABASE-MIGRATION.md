# Database Migration Guide

This document explains how to migrate data from browser localStorage to the PostgreSQL database for the Calma Car Rental system.

## Background

The original Calma Car Rental system stored bookings in each user's browser localStorage. While this worked for testing, it had significant limitations:

1. Bookings were only visible on the device/browser where they were created
2. Data could be lost if users cleared their browser data
3. Multiple agents couldn't see the same bookings
4. Data wasn't accessible across different computers/devices

The new system moves all bookings to a centralized PostgreSQL database while maintaining localStorage as a fallback.

## Migration Process

There are two ways to migrate data:

### 1. Automatic Migration (Recommended)

The admin dashboard has a built-in migration tool that automatically transfers all bookings from localStorage to the database:

1. Log in to the admin dashboard at `/admin.html` (credentials: admin/admin123)
2. Look for the "Migrate Data" button in the header
3. Click the button to start the migration
4. You'll see a notification showing the migration progress and results
5. Once complete, your bookings will be stored in the database while still available in localStorage

### 2. Manual Migration

If you prefer to manually migrate bookings:

1. Log in to the admin dashboard
2. Go to the diagnostic page by clicking "Diagnostics" in the header
3. Check if your database is connected (should show "CONNECTED" in green)
4. Return to the admin dashboard
5. For each booking shown, manually note the details and re-enter them through the booking system
6. Complete the booking process for each to store them in the database

## Verifying Migration Success

To verify your migration was successful:

1. Access the diagnostic page at `/admin-diagnostic.html`
2. Check that:
   - Database connection shows "CONNECTED"
   - Bookings table shows "EXISTS"
   - Records count matches the number of bookings you had

You can also check individual bookings in the admin dashboard to ensure all data was transferred correctly.

## Troubleshooting

### Database Not Connected

If the database shows as disconnected:

1. Check your Railway database setup
2. Verify the DATABASE_URL environment variable is set correctly
3. Try initializing the database by clicking "Init Database" on the diagnostic page

### Missing Bookings

If bookings aren't appearing after migration:

1. Check the browser console for any error messages
2. Try refreshing the admin dashboard
3. Verify the database connection and table status on the diagnostic page
4. Check that your bookings have valid data (some incomplete bookings might be skipped)

### General Errors

For other issues:

1. Check the browser console for error messages
2. Try clearing your browser cache and reloading
3. Ensure your Railway deployment is running correctly

## Technical Details

The migration process:

1. Collects all bookings from localStorage (both from the "adminBookings" collection and individual "booking_*" entries)
2. Sends them to the server via the `/api/migrate-bookings` endpoint
3. The server checks each booking against the database to prevent duplicates
4. Valid bookings are inserted into the PostgreSQL "bookings" table
5. A status report is returned showing how many bookings were migrated

The database schema is designed to store both structured booking data (customer name, car details, dates) and the complete booking object in a JSONB column for maximum flexibility.

## Need Help?

If you encounter any issues with the migration process, please contact the development team for assistance. 