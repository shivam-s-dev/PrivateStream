const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const datasets = await prisma.dataset.findMany();
  for (const d of datasets) {
    const sessions = await prisma.session.findMany({ where: { datasetId: d.id } });
    const totalSessions = sessions.length;
    const totalEarned = sessions.reduce((sum, s) => sum + Number(s.spentUsdc ?? 0), 0);
    
    await prisma.dataset.update({
      where: { id: d.id },
      data: { totalSessions, totalEarned }
    });
    console.log(`Updated dataset ${d.id}: ${totalSessions} sessions, $${totalEarned} earned`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
