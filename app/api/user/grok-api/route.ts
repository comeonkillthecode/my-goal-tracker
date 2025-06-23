import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { sql } from "@/lib/db"

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

    const updatedUser = await sql`
      UPDATE users 
      SET grok_api_id = ${grokApiId}
      WHERE id = ${user.userId}
      RETURNING id
    `

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Grok API key updated successfully" })
  } catch (error) {
    console.error("Grok API update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
