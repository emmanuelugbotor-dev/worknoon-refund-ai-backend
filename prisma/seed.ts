import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const products = [
  'Wireless Headphones','Smart Watch','Running Shoes','Coffee Maker','Laptop Stand',
  'Mechanical Keyboard','Bluetooth Speaker','Air Fryer','Backpack','Monitor',
  'USB-C Dock','Gaming Mouse','Desk Lamp','Robot Vacuum','Phone Case'
];

async function main() {
  const existing = await prisma.customer.count();
  if (existing > 0) { console.log(`Seed skipped: ${existing} customers already exist.`); return; }

  for (let i = 1; i <= 15; i++) {
    const customer = await prisma.customer.create({
      data: {
        publicId: `CUS-${String(i).padStart(3, '0')}`,
        name: ['John Doe','Jane Smith','Mike Jones','Sarah Brown','David Wilson','Linda Taylor','Chris Moore','Grace Davis','Daniel Martin','Emma Clark','Peter Lewis','Olivia Walker','James Hall','Sophia Allen','Noah Young'][i-1],
        email: `customer${i}@example.com`
      }
    });
    const daysAgo = i === 11 || i === 12 ? 65 : 5 + (i % 10);
    const order = await prisma.order.create({
      data: {
        publicId: `ORD-${String(1000 + i)}`,
        customerId: customer.id,
        amount: i === 2 ? 750 : i === 12 ? 899 : 79 + i * 17.5,
        orderDate: new Date(Date.now() - daysAgo * 86400000),
        items: { create: [{ productName: products[i-1], quantity: 1, price: i === 2 ? 750 : i === 12 ? 899 : 79 + i * 17.5, finalSale: [3, 10, 14].includes(i), condition: 'NEW' }] }
      }
    });
    console.log(`Seeded ${customer.publicId} / ${order.publicId}`);
  }
}

main().finally(() => prisma.$disconnect());
