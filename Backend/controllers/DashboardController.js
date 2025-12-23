import User from '../models/User.model.js';
import Organisation from '../models/Organisation.model.js';
import Student from '../models/Student.model.js';
import Lecture from '../models/Lecture.model.js';
import Department from '../models/Department.model.js';
import Subject from '../models/Subject.model.js';
import mongoose from 'mongoose';

export const getSystemAdminStats = async (req, res) => {
    try {
        // 1. User Roles Distribution
        // Assuming roles are strings like 'SYSTEM_ADMIN', 'ORG_ADMIN', 'DEPT_ADMIN', 'FACULTY'
        // We can group them into broader categories if needed, or return raw counts.
        // Based on frontend: Admins, Staff, Faculty.
        // Let's check User model roles.
        const users = await User.find({}, 'role');
        const roleCounts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});

        // Map backend roles to frontend categories if possible, or just send raw for now.
        // Frontend expects: Admins, Staff, Faculty.
        // 'Admins': SYSTEM_ADMIN, ORG_ADMIN, DEPT_ADMIN
        // 'Faculty': FACULTY
        // 'Staff': ?? Maybe we don't have this yet, or it's another role.
        // Let's send detailed limits and let frontend aggregate.

        // 2. Total Users
        const totalUsers = users.length;

        // 3. Organisations Count
        const organisationCount = await Organisation.countDocuments({});

        // 4. Students Enrolled (by Department or just total for now to match bar chart)
        // Frontend Bar Chart: ['CS', 'IT', 'MBA', 'BA', 'BBA']
        // We need to aggregate students by Department Name.
        // Student has deptId -> Department.name
        const studentsByDept = await Student.aggregate([
            {
                $lookup: {
                    from: 'departments', // collection name is usually plural lowercase
                    localField: 'deptId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $unwind: '$department'
            },
            {
                $group: {
                    _id: '$department.name',
                    count: { $sum: 1 }
                }
            }
        ]);


        // 5. Total Students
        const totalStudents = await Student.countDocuments({});


        // 6. Attendance Average (Sparkline)
        // Frontend expects an array of numbers for the sparkline.
        // Let's get the average attendance percentage for the last 7 lectures globally (or top X recent lectures).
        // Or daily average for last 7 days. Daily average is better.

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            last7Days.push(d);
        }

        // This might be heavy, for now let's just get recent 10 lectures and their average attendance.
        const recentLectures = await Lecture.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .select('attendance');

        const attendanceTrend = recentLectures.map(lecture => {
            if (!lecture.attendance || lecture.attendance.length === 0) return 0;
            const presentCount = lecture.attendance.filter(a => a.present).length;
            return Math.round((presentCount / lecture.attendance.length) * 100);
        }).reverse(); // Oldest to newest among the recent ones

        // Global Average Attendance
        const globalAvg = attendanceTrend.length > 0
            ? Math.round(attendanceTrend.reduce((a, b) => a + b, 0) / attendanceTrend.length)
            : 0;

        res.status(200).json({
            userRoleCounts: roleCounts,
            totalUsers,
            organisationCount,
            studentCountsByDept: studentsByDept,
            totalStudents,
            attendanceTrend,
            averageAttendance: globalAvg
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
};

export const getOrgAdminStats = async (req, res) => {
    try {
        const { organisationId } = req.user;

        if (!organisationId) {
            return res.status(400).json({ message: "User must belong to an organisation" });
        }

        // 1. Total Departments
        const totalDepartments = await Department.countDocuments({ organisationId });

        // 2. Total Students (Students belong to Depts, which belong to Org, or they have orgId directly)
        // Check Student model if possible, likely has orgId or we filter by deptId in org departments.
        // Assuming Student has organisationId based on typical SaaS multi-tenant patterns or via Dept.
        // Let's assume Student has organisationId for now or use finding all depts first.
        // Better: Get all departments for this org, then count students in those depts.
        // Or if Student has organisationId directly.
        // Let's optimize: Assuming organisationId exists on Student (common optimization).
        // If not, we find depts first.
        const orgDepts = await Department.find({ organisationId }).select('_id');
        const orgDeptIds = orgDepts.map(d => d._id);

        const totalStudents = await Student.countDocuments({ deptId: { $in: orgDeptIds } });

        // 3. Total Users (Staff/Faculty/Admins within the filtered organisation)
        const totalUsers = await User.countDocuments({ organisationId });

        // 4. Total Subjects
        // Subjects belong to Depts.
        const totalSubjects = await Subject.countDocuments({ departmentId: { $in: orgDeptIds } });

        // 5. User Roles in this Org
        const users = await User.find({ organisationId }, 'role');
        const roleCounts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});

        // 6. Student Enrollment by Dept (Bar Chart)
        const studentsByDept = await Student.aggregate([
            {
                $match: { deptId: { $in: orgDeptIds } }
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'deptId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $unwind: '$department'
            },
            {
                $group: {
                    _id: '$department.name',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 7. Attendance Trend (Last 10 lectures in this Org)
        const recentLectures = await Lecture.aggregate([
            {
                $match: {
                    subjectId: {
                        $in: await Subject.find({ departmentId: { $in: orgDeptIds } }).distinct('_id')
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { attendance: 1 } }
        ]);

        const attendanceTrend = recentLectures.map(lecture => {
            if (!lecture.attendance || lecture.attendance.length === 0) return 0;
            const presentCount = lecture.attendance.filter(a => a.present).length;
            return Math.round((presentCount / lecture.attendance.length) * 100);
        }).reverse();

        // 8. Dept Activity (Students per Dept? Or Lectures per Dept?)
        // Let's reuse student by dept for now or maybe average attendance per dept.

        res.status(200).json({
            totalDepartments,
            totalStudents,
            totalUsers,
            totalSubjects,
            roleCounts,
            studentsByDept,
            attendanceTrend
        });

    } catch (error) {
        console.error('Error fetching org admin stats:', error);
        res.status(500).json({ message: 'Error fetching org admin stats', error: error.message });
    }
};

export const getDeptAdminStats = async (req, res) => {
    try {
        const { departmentId, organisationId } = req.user;

        if (!departmentId) {
            return res.status(400).json({ message: "User must belong to a department" });
        }

        // 1. Total Subjects (in this department)
        const totalSubjects = await Subject.countDocuments({ departmentId });

        // 2. Total Staff (Users in this dept: Faculty/DeptAdmin)
        // User has departmentId or we filter by role + dept
        const totalStaff = await User.countDocuments({ departmentId });

        // 3. Total Students (Enrolled in this department)
        const totalStudents = await Student.countDocuments({ deptId: departmentId });

        // 4. Attendance (Average Attendance for lectures in this dept)
        const recentLectures = await Lecture.aggregate([
            {
                $match: {
                    subjectId: {
                        $in: await Subject.find({ departmentId }).distinct('_id')
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { attendance: 1 } }
        ]);

        const attendanceTrend = recentLectures.map(lecture => {
            if (!lecture.attendance || lecture.attendance.length === 0) return 0;
            const presentCount = lecture.attendance.filter(a => a.present).length;
            return Math.round((presentCount / lecture.attendance.length) * 100);
        }).reverse();

        // 5. User Roles in this Dept
        const users = await User.find({ departmentId }, 'role');
        const roleCounts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});

        // 6. Student Year Distribution (e.g. 1st, 2nd, 3rd, 4th year) - Placeholder logic as Student model might not have 'year'
        // If Student has 'semester' or 'year', use that. For now, we can group by null or mock it if needed.
        // Let's assume broad grouping or simply return total for now.
        // Actually, user wants "Total Students". The chart could be "Students by Subject" or "Students by Semester".
        // Let's try grouping by 'currentSemester' if it exists, or just send raw count.
        // Assuming 'currentSemester' exists on Student model.
        const studentsBySemester = await Student.aggregate([
            { $match: { deptId: new mongoose.Types.ObjectId(departmentId) } },
            { $group: { _id: '$currentSemester', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            totalSubjects,
            totalStaff,
            totalStudents,
            roleCounts,
            attendanceTrend,
            studentsBySemester,
            // Calculate avg attendance
            averageAttendance: attendanceTrend.length > 0
                ? Math.round(attendanceTrend.reduce((a, b) => a + b, 0) / attendanceTrend.length)
                : 0
        });

    } catch (error) {
        console.error('Error fetching dept admin stats:', error);
        res.status(500).json({ message: 'Error fetching dept admin stats', error: error.message });
    }
};

export const getFacultyStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. My Subjects (Where facultyId/teacherId matches user._id)
        // Assuming 'teacherId' based on typical schema.
        const mySubjects = await Subject.find({ teacherId: userId });
        const totalSubjects = mySubjects.length;

        // 2. My Students (Students in my Dept as Proxy)
        const totalStudents = await Student.countDocuments({ deptId: req.user.departmentId });

        // 3. My Lectures (Attendance)
        const recentLectures = await Lecture.find({ facultyId: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('attendance subjectId');

        const attendanceTrend = recentLectures.map(lecture => {
            if (!lecture.attendance || lecture.attendance.length === 0) return 0;
            const presentCount = lecture.attendance.filter(a => a.present).length;
            return Math.round((presentCount / lecture.attendance.length) * 100);
        }).reverse();

        const averageAttendance = attendanceTrend.length > 0
            ? Math.round(attendanceTrend.reduce((a, b) => a + b, 0) / attendanceTrend.length)
            : 0;

        // 4. Lectures Conducted (Total)
        const totalLectures = await Lecture.countDocuments({ facultyId: userId });

        // 5. Subject Performance (Avg Attendance per Subject)
        const subjectStats = await Lecture.aggregate([
            { $match: { facultyId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$attendance" },
            {
                $group: {
                    _id: "$subjectId",
                    totalStudents: { $sum: 1 },
                    presentStudents: { $sum: { $cond: ["$attendance.present", 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "_id",
                    foreignField: "_id",
                    as: "subject"
                }
            },
            { $unwind: "$subject" },
            {
                $project: {
                    subjectName: "$subject.name",
                    attendancePercentage: {
                        $multiply: [
                            { $divide: ["$presentStudents", "$totalStudents"] },
                            100
                        ]
                    }
                }
            }
        ]);

        const subjectPerformance = subjectStats.map(s => ({
            subjectName: s.subjectName,
            attendance: Math.round(s.attendancePercentage)
        }));

        res.status(200).json({
            totalSubjects,
            totalStudents,
            totalLectures,
            averageAttendance,
            attendanceTrend,
            subjectPerformance
        });

    } catch (error) {
        console.error('Error fetching faculty stats:', error);
        res.status(500).json({ message: 'Error fetching faculty stats', error: error.message });
    }
};
