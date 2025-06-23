import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  require("fs").mkdirSync(DATA_DIR, { recursive: true })
}

function readUsers() {
  if (!existsSync(USERS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(USERS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeUsers(users: any[]) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

function getNextUserId() {
  const users = readUsers()
  return users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1
}

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

    const users = readUsers()

    // Check if user already exists
    const existingUser = users.find((u: any) => u.username === username)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = {
      id: getNextUserId(),
      username,
      password: hashedPassword,
      grokApiId: grokApiId || null,
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    writeUsers(users)

    return NextResponse.json({
      message: "User created successfully",
      user: { id: newUser.id, username: newUser.username, grokApiId: newUser.grokApiId },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
