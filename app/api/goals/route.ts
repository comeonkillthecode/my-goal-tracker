import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const GOALS_FILE = join(DATA_DIR, "goals.json")

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  require("fs").mkdirSync(DATA_DIR, { recursive: true })
}

function readGoals() {
  if (!existsSync(GOALS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(GOALS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeGoals(goals: any[]) {
  writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2))
}

function getNextGoalId() {
  const goals = readGoals()
  return goals.length > 0 ? Math.max(...goals.map((g: any) => g.id)) + 1 : 1
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

export async function GET(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const goals = readGoals()
  const userGoals = goals.filter((g: any) => g.userId === user.userId)
  return NextResponse.json(userGoals)
}

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { title, description, targetDate } = await request.json()

    if (!title || !description || !targetDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const goals = readGoals()

    const newGoal = {
      id: getNextGoalId(),
      userId: user.userId,
      title,
      description,
      targetDate,
      createdAt: new Date().toISOString(),
    }

    goals.push(newGoal)
    writeGoals(goals)

    return NextResponse.json(newGoal)
  } catch (error) {
    console.error("Goal creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
