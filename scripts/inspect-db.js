import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    const roles = await prisma.role.findMany()
    console.log("Roles:", roles.map(r => r.name))

    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    console.log("Users:", users.map(u => ({ username: u.username, roles: u.userRoles.map(ur => ur.role.name) })))

    const academicYears = await prisma.academicYear.findMany({
      include: { terms: true }
    })
    console.log("Academic Years:", academicYears.map(y => ({ name: y.name, terms: y.terms.map(t => t.name) })))

    const classes = await prisma.class.findMany()
    console.log("Classes:", classes.map(c => c.name))

    const subjects = await prisma.subject.findMany()
    console.log("Subjects:", subjects.map(s => s.name))

    const students = await prisma.student.count()
    console.log("Student count:", students)
  } catch (error) {
    console.error("Error inspecting database:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
