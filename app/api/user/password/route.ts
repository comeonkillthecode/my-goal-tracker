import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
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
    const { currentPassword, newPassword } = await request.json()

    // Get current user data
    const userData = await sql`
      SELECT password FROM users WHERE id = ${user.userId}
    `

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData[0].password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await sql`
      UPDATE users 
      SET password = ${hashedNewPassword}
      WHERE id = ${user.userId}
    `

    return NextResponse.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Password update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
