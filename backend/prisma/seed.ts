import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@exemple.com';
    const existingUser = await prisma.utilisateurs.findUnique({
        where: { email },
    });

    if (!existingUser) {
        const hashedPassword = await bcrypt.hash('MotDePasse123!', 10);
        await prisma.utilisateurs.create({
            data: {
                nom: 'Admin',
                prenom: 'System',
                email,
                mot_de_passe: hashedPassword,
                role: 'admin',
            },
        });
        console.log('Default admin user created.');
    } else {
        console.log('Admin user already exists.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
