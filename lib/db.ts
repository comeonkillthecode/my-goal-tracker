import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

export const sql = neon(process.env.DATABASE_URL)

// Database initialization and schema creation
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        grok_api_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create goals table
    await sql`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        target_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('positive', 'negative')),
        description TEXT NOT NULL,
        points INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        date DATE NOT NULL,
        is_template BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_is_template ON tasks(is_template)`

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}
