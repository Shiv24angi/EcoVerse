# MongoDB Setup Guide for EcoTracker

## Option 1: MongoDB Atlas (Recommended - Free & Easy)

1. Go to https://www.mongodb.com/atlas
2. Create a free account
3. Create a new project
4. Build a cluster (choose M0 Sandbox - FREE)
5. Create a database user:
   - Username: ecoverse
   - Password: (generate a secure password)
6. Network Access: Add IP Address (0.0.0.0/0 for development)
7. Connect -> Connect your application
8. Copy the connection string
9. Replace `<password>` with your actual password
10. Replace `<database>` with `carbontracker`

Your connection string should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/carbontracker?retryWrites=true&w=majority
```

11. Update your `.env.local` file with this connection string

## Option 2: Local MongoDB via Docker (if network allows)

```bash
# Pull and run MongoDB container
docker run -d -p 27017:27017 --name mongodb-ecotracker mongo:latest

# Update .env.local with:
MONGODB_URI=mongodb://localhost:27017/carbontracker
```

## Option 3: Install MongoDB locally

```bash
# For Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Update .env.local with:
MONGODB_URI=mongodb://localhost:27017/carbontracker
```

## Testing the Connection

After setting up MongoDB, test your connection by running:
```bash
cd /home/fusion/Code/GitRepos/ecotracker-frontend
npm run dev
```

Then try to sign up for a new account to test the database connection.
