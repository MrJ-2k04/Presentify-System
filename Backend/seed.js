import 'dotenv/config'; // Load env vars if present

// Set default env if not present
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

const seed = async () => {
    // Dynamic import to ensure NODE_ENV is set before db/index.js is evaluated
    const { connectToDb } = await import('./db/index.js');
    const {
        SystemAdmin, OrgAdmin, DeptAdmin, Faculty,
        Organisation, Department, Subject
    } = await import('./models/index.js');
    const bcrypt = (await import('bcryptjs')).default;
    const { ROLES } = await import('./utils/constants.js');

    connectToDb(async () => {
        try {
            console.log(`Seeding data in ${process.env.NODE_ENV} DB...`);

            // 1. System Admin
            const existingAdmin = await SystemAdmin.findOne({ role: ROLES.SYSTEM_ADMIN });
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash('password123', 10);
                await SystemAdmin.create({
                    name: 'System Administrator',
                    email: 'admin@system.com',
                    password: hashedPassword,
                    role: ROLES.SYSTEM_ADMIN,
                    isActive: true,
                    contactNumber: '0000000000'
                });
                console.log('Created System Admin: admin@system.com');
            }

            // 2. Organisations
            const orgsData = [
                {
                    name: 'Tech University',
                    address: '123 Tech Lane',
                    code: 'TECH-U',
                    website: 'https://tech.edu',
                    contact: '1234567890'
                },
                {
                    name: 'Management Institute',
                    address: '456 Biz Rd',
                    code: 'BIZ-I',
                    website: 'https://biz.edu',
                    contact: '0987654321'
                }
            ];

            const createdOrgs = [];
            for (const org of orgsData) {
                let doc = await Organisation.findOne({ name: org.name });
                if (!doc) {
                    doc = await Organisation.create(org);
                    console.log(`Created Org: ${org.name}`);

                    // Create Org Admin
                    const hashedPassword = await bcrypt.hash('password123', 10);
                    const orgAdminEmail = `admin@${org.code.toLowerCase()}.com`;
                    let orgAdmin = await OrgAdmin.findOne({ email: orgAdminEmail });
                    if (!orgAdmin) {
                        await OrgAdmin.create({
                            name: `${org.name} Admin`,
                            email: orgAdminEmail,
                            password: hashedPassword,
                            role: ROLES.ORG_ADMIN,
                            organisationId: doc._id,
                            isActive: true,
                            contactNumber: '1111111111'
                        });
                        console.log(`Created Org Admin: ${orgAdminEmail}`);
                    }
                }
                createdOrgs.push(doc);
            }

            // 3. Departments & Dept Admins
            const deptNames = [['Computer Science', 'Information IT'], ['MBA', 'BBA']];

            for (let i = 0; i < createdOrgs.length; i++) {
                const org = createdOrgs[i];
                const depts = deptNames[i];

                for (const dName of depts) {
                    let dept = await Department.findOne({ name: dName, organisationId: org._id });
                    if (!dept) {
                        dept = await Department.create({
                            name: dName,
                            code: dName.substring(0, 3).toUpperCase(),
                            organisationId: org._id,
                            totalSemesters: 8
                        });
                        console.log(`Created Dept: ${dName} in ${org.name}`);

                        // Create Dept Admin
                        const hashedPassword = await bcrypt.hash('password123', 10);
                        const deptAdminEmail = `head@${dName.replace(/\s/g, '').toLowerCase()}.com`;
                        let deptAdmin = await DeptAdmin.findOne({ email: deptAdminEmail });
                        if (!deptAdmin) {
                            await DeptAdmin.create({
                                name: `Head of ${dName}`,
                                email: deptAdminEmail,
                                password: hashedPassword,
                                role: ROLES.DEPT_ADMIN,
                                organisationId: org._id,
                                departmentId: dept._id,
                                isActive: true,
                                contactNumber: '2222222222'
                            });
                            console.log(`Created Dept Admin: ${deptAdminEmail}`);
                        }

                        // 4. Faculties
                        const facultyEmail = `faculty@${dName.replace(/\s/g, '').toLowerCase()}.com`;
                        let faculty = await Faculty.findOne({ email: facultyEmail });
                        if (!faculty) {
                            faculty = await Faculty.create({
                                name: `Prof. ${dName}`,
                                email: facultyEmail,
                                password: hashedPassword,
                                role: ROLES.FACULTY,
                                organisationId: org._id,
                                departmentId: dept._id,
                                isActive: true,
                                designation: 'Professor',
                                contactNumber: '3333333333'
                            });
                            console.log(`Created Faculty: ${facultyEmail}`);
                        }

                        // 5. Subjects
                        const subName = `${dName} 101`;
                        let subject = await Subject.findOne({ name: subName });
                        if (!subject) {
                            await Subject.create({
                                name: subName,
                                deptId: dept._id,
                                faculties: [faculty._id],
                                semester: 1,
                                isActive: true
                            });
                            console.log(`Created Subject: ${subName}`);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error seeding data:', error);
        } finally {
            process.exit(0);
        }
    });
};

seed();
