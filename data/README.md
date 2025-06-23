# Data Directory

This directory contains JSON files that serve as the application's data storage:

- `users.json` - User accounts with hashed passwords and Grok API keys
- `goals.json` - User goals with titles, descriptions, and target dates  
- `tasks.json` - Daily tasks linked to goals with completion status and points

## File Structure

### users.json
\`\`\`json
[
  {
    "id": 1,
    "username": "user1",
    "password": "hashed_password",
    "grokApiId": "user_grok_api_key",
    "createdAt": "2025-01-23T20:19:44.000Z"
  }
]
\`\`\`

### goals.json
\`\`\`json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Lose Weight",
    "description": "Lose 10kg in 3 months",
    "targetDate": "2025-12-31",
    "createdAt": "2025-01-23T20:19:44.000Z"
  }
]
\`\`\`

### tasks.json
\`\`\`json
[
  {
    "id": 1,
    "goalId": 1,
    "type": "positive",
    "description": "Exercise 30min",
    "points": 30,
    "completed": false,
    "date": "2025-01-23"
  }
]
\`\`\`

## Notes

- Files are created automatically when the application starts
- Data persists between server restarts
- For production, consider migrating to a proper database
