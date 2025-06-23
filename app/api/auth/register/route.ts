import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, password, grokApiId } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await sql`
      INSERT INTO users (username, password, grok_api_id)
      VALUES (${username}, ${hashedPassword}, ${grokApiId || null})
      RETURNING id, username, grok_api_id, created_at
    `

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        grokApiId: newUser[0].grok_api_id,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
