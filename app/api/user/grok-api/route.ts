import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")

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

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

export async function PUT(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { grokApiId } = await request.json()

    const users = readUsers()
    const userIndex = users.findIndex((u: any) => u.id === user.userId)

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    users[userIndex] = {
      ...users[userIndex],
      grokApiId,
    }

    writeUsers(users)
    return NextResponse.json({ message: "Grok API key updated successfully" })
  } catch (error) {
    console.error("Grok API update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
