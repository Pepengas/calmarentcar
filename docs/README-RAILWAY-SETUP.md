# Setting Up PostgreSQL Database on Railway

This guide explains how to set up a PostgreSQL database on Railway for the Calma Car Rental website.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. Your Calma Car Rental website code (with the updates we've made)

## Steps to Set Up Your Database

### 1. Create a new Railway project

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click on "New Project"
3. Choose "Provision PostgreSQL"

### 2. Get your PostgreSQL connection string

1. In your new project, click on the PostgreSQL service
2. Go to the "Connect" tab
3. Find and copy the "Postgres Connection URL"
   
This URL will look something like:
```
postgresql://postgres:password@containers-us-west-123.railway.app:7890/railway
```

### 3. Set up your website to use this database

#### Option A: With Railway hosting (recommended)

1. In your Railway project, click "New Service" → "GitHub Repo"
2. Connect to your GitHub repository
3. Add the following environment variables:
   - `DATABASE_URL` = [your PostgreSQL connection string]
   - `NODE_ENV` = production
   - `PORT` = 3000

4. Deploy your application

#### Option B: Manual deployment

1. Create a `.env` file in your project (based on `.env.example`) 
2. Add your PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:7890/railway
   NODE_ENV=production
   PORT=3000
   ```
3. Deploy your code to your hosting provider

## What This Will Do

Setting up the database will:

1. Create a persistent database for your bookings
2. Store all bookings in PostgreSQL instead of localStorage
3. Make your bookings visible across all devices/browsers
4. Ensure bookings are preserved even when browsers clear their localStorage

## Testing Your Setup

1. After deployment, go to your website and make a test booking
2. Check your admin dashboard to see if the booking appears
3. Try accessing the admin dashboard from a different browser to verify the database is working properly

## Troubleshooting

- **Bookings not appearing**: Check your server logs on Railway for any errors
- **Database connection issues**: Verify your `DATABASE_URL` environment variable is correct
- **Server errors**: Check that all required dependencies are installed

If you encounter issues, look at the browser's developer console and your Railway logs for error messages.

## Maintaining Your Database

- Railway's free tier has limitations on database size and usage
- Consider upgrading to a paid plan if you'll have many bookings
- Railway handles database backups automatically, but you may want to export data periodically for safety

## Security Notes

- Your database contains customer information - make sure admin credentials are secure
- The provided admin dashboard uses a simple username/password system - consider enhancing security for production 