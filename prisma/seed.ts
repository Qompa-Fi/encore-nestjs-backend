import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const catData: Prisma.catsCreateInput[] = [
  {
    name: 'Alice',
    age: 9.2,
    breed: "Arabian",
  },
]

async function main() {
  console.log(`Start seeding ...`)
  for (const u of catData) {
    const user = await prisma.cats.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })