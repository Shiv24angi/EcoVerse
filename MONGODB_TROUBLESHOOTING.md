# MongoDB Atlas Setup Troubleshooting Guide

## Current Issue
You're experiencing a `querySrv EREFUSED` error when trying to connect to MongoDB Atlas. This can happen due to several reasons:

## Possible Causes & Solutions

### 1. **Network/DNS Issues**
- Your internet connection might be blocking MongoDB Atlas
- DNS resolution issues with the MongoDB cluster
- Firewall blocking the connection

### 2. **MongoDB Atlas Configuration Issues**
- Incorrect connection string
- IP address not whitelisted
- Database user credentials incorrect
- Cluster might be paused or deleted

### 3. **Environment Variable Issues**
- `.env.local` not being loaded properly
- Typo in the connection string

## Quick Fixes to Try

### Option 1: Update your MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster
3. Click "Connect" → "Connect your application"
4. Copy the new connection string
5. Update your `.env.local` file

### Option 2: Check Network Access Settings

1. In MongoDB Atlas, go to "Network Access"
2. Make sure your IP address is whitelisted
3. For development, you can temporarily allow access from anywhere (0.0.0.0/0)

### Option 3: Verify Database User

1. Go to "Database Access" in MongoDB Atlas
2. Make sure your user exists and has the correct permissions
3. Try creating a new user with a simple password

### Option 4: Use Local MongoDB for Development

If Atlas continues to have issues, you can set up a local MongoDB:

```bash
# Install MongoDB locally (Ubuntu/Debian)
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Update your .env.local to use local MongoDB:
MONGODB_URI=mongodb://localhost:27017/carbontracker
```

### Option 5: Alternative Connection String Format

Try this alternative connection string format in your `.env.local`:

```bash
MONGODB_URI=mongodb+srv://admin:admin1234@cluster0.eiig6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&ssl=true
```

## Test Your Connection

I've updated the MongoDB connection file with better error handling. The app will now show more detailed error messages to help debug the issue.

## If All Else Fails

As a temporary solution for development, you can:

1. Use MongoDB Atlas free tier with a different cluster
2. Use a local MongoDB installation
3. Use MongoDB Atlas Serverless
4. Use a different database service like Supabase or PlanetScale

Would you like me to help you set up any of these alternatives?
