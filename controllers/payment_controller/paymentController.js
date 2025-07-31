"use strict";

const { Payment, StudentDetails, User, GradeFee, UserBranch, Branch, Grade, UserGrade, Course, Admission } = require("../../models/payment_models/index");
const { Op, sequelize } = require("sequelize");
const moment = require('moment-timezone');
const { format, startOfYear, addMonths, endOfDay, isBefore } = require('date-fns');



exports.searchStudents = async (req, res) => {
  try {
    const { student_no, name } = req.query;

    if (!student_no && !name) {
      return res.status(400).json({ error: "At least one filter is required" });
    }

    let studentWhereCondition = {};
    let includeWhere = {};

    // Accept alphanumeric or string student numbers
    if (student_no) {
      studentWhereCondition.student_no = {
        [Op.like]: `%${student_no}%`
      };
    }

    if (name) {
      includeWhere[Op.or] = [
        { first_name: { [Op.like]: `%${name}%` } },
        { last_name: { [Op.like]: `%${name}%` } }
      ];
    }

    const students = await StudentDetails.findAll({
      where: studentWhereCondition,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["first_name", "last_name", "email", "phn_num"],
          required: true,
          where: includeWhere,
          include: [
            {
              model: UserBranch,
              as: "user_branch",
              required: false,
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["branch_name"],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ["id","student_no", "user_id", "photo_url"],
      order: [["student_no", "ASC"]],
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found" });
    }

    const formattedStudents = students.map((student) => {
      const user = student.user || {};
      const userBranch = user.user_branch && user.user_branch.length > 0 ? user.user_branch[0] : null;
      const branch = userBranch ? userBranch.branch : null;
      return {
        student_details_id: student.id || null,
        student_no: student.student_no || null,
        photo_url: student.photo_url || null,
        branch_name: branch ? branch.branch_name : null,
        full_name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null,
        email: user.email || null,
        phn_num: user.phn_num || null,
      };
    });

    res.json(formattedStudents);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await StudentDetails.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["first_name", "last_name", "email", "phn_num"],
          required: true,
          include: [
            {
              model: UserBranch,
              as: "user_branch",
              required: false,
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["branch_name"],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: Payment,
          attributes: ["id"],
          required: false,
        },
      ],
      attributes: ["student_no", "user_id", "photo_url"],
      order: [["student_no", "ASC"]],
    });

    if (!students.length) {
      return res.status(200).json([]); // Return empty array with 200 status
    }

    const formattedStudents = students.map((student) => {
      const user = student.user || {};
      const userBranch = user.user_branch && user.user_branch.length > 0 ? user.user_branch[0] : null;
      const branch = userBranch ? userBranch.branch : null;
      return {
        student_no: student.student_no || null,
        photo_url: student.photo_url || null,
        branch_name: branch ? branch.branch_name : null,
        full_name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null,
        email: user.email || null,
        phn_num: user.phn_num || null,
      };
    });

    res.json(formattedStudents);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const calculateCourseFees = async (studentDetailsId, selectedMonths = []) => {
  try {
    const student = await StudentDetails.findByPk(studentDetailsId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name'],
          include: [
            {
              model: UserBranch,
              as: 'user_branch',
              required: false,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  attributes: ['branch_name'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ['student_no', 'user_id'],
    });

    if (!student) throw new Error("Student not found");

    const userGrades = await UserGrade.findAll({
      where: { user_id: student.user_id },
      attributes: ['grade_id'],
      include: [{ model: Grade, attributes: ['id'], include: [{ model: Course, attributes: ['name'] }] }],
    });

    if (!userGrades || userGrades.length === 0) throw new Error("No grades found for this student");

    const gradeIds = userGrades.map(g => g.grade_id);
    const gradeFees = await GradeFee.findAll({
      where: { grade_id: gradeIds },
      attributes: ['grade_id', 'fee'],
      include: [{ model: Grade, required: true, include: [{ model: Course, required: true, attributes: ['name'] }] }],
    });

    const payments = await Payment.findAll({
      where: { student_details_id: studentDetailsId },
      attributes: ['payment_date'],
    });

    let totalCourseFees = 0;
    const courseFees = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // If selectedMonths is provided, use it; otherwise, default to the current month
    const targetMonths = selectedMonths.length > 0 ? selectedMonths : [format(new Date(), 'MMM')];

    // Validate selectedMonths
    const invalidMonths = targetMonths.filter(month => !months.includes(month));
    if (invalidMonths.length > 0) {
      throw new Error(`Invalid months: ${invalidMonths.join(', ')}`);
    }

    // Build courseFees for each selected month
    targetMonths.forEach(month => {
      courseFees[month] = {};
      gradeFees.forEach(gf => {
        const gradeName = `Grade ${gf.grade_id}`;
        if (!courseFees[month][gradeName]) courseFees[month][gradeName] = {};
        courseFees[month][gradeName][gf.Grade.Course.name] = gf.fee || 1000;
        totalCourseFees += gf.fee || 1000;
      });
    });

    const admissionFee = payments.length === 0 ? 1000 : 0;
    const totalFees = totalCourseFees + admissionFee;

    return {
      courseFees,
      totalCourseFees,
      admissionFee,
      totalFees,
    };
  } catch (error) {
    console.error("Error calculating course fees:", error.message);
    throw error;
  }
};


exports.createPayment = async (req, res) => {
  try {
    const { student_details_id } = req.params;
    const { selectedMonths, course, full_name, student_no, status, branch_name } = req.body;

    if (!student_details_id || isNaN(student_details_id)) {
      return res.status(400).json({ error: "Valid student_details_id is required" });
    }
    if (!selectedMonths || !Array.isArray(selectedMonths) || selectedMonths.length === 0) {
      return res.status(400).json({ error: "Selected months are required and must be an array" });
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const invalidMonths = selectedMonths.filter(month => !months.includes(month));
    if (invalidMonths.length > 0) {
      return res.status(400).json({ error: `Invalid months selected: ${invalidMonths.join(', ')}` });
    }

    // Fetch course fees for the selected months
    const { courseFees, totalCourseFees, admissionFee, totalFees } = await calculateCourseFees(student_details_id, selectedMonths);

    if (!courseFees || Object.keys(courseFees).length === 0) {
      return res.status(400).json({ error: "Failed to calculate course fees" });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const payments = [];

    // Create payment for each selected month
    for (const month of selectedMonths) {
      const monthIndex = months.indexOf(month);
      const paymentDate = new Date(currentYear, monthIndex, 10);

      const payment = await Payment.create({
        student_details_id,
        payment_date: paymentDate,
        amount: totalFees / selectedMonths.length,
        status: status || 'Paid',
        course: course || 'Unknown',
        full_name: full_name || 'Unknown Student',
        student_no: student_no || `STU_${Date.now()}`,
        branch_name: branch_name || 'N/A',
      });
      payments.push(payment);
    }

    const student = await StudentDetails.findByPk(student_details_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name'],
          include: [
            {
              model: UserBranch,
              as: 'user_branch',
              required: false,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  attributes: ['branch_name'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(201).json({
      message: "Payments created successfully",
      paymentIds: payments.map(p => p.id),
      student_details_id,
      full_name: student.user ? `${student.user.first_name} ${student.user.last_name}` : full_name || 'Unknown Student',
      student_no: student.student_no || student_no || `STU_${Date.now()}`,
      branch_name: student.user.user_branch?.[0]?.branch?.branch_name || branch_name || 'N/A',
      course: course || 'Unknown',
      course_fees: courseFees,
      total_course_fees: totalCourseFees,
      admission_fee: admissionFee,
      total_fees: totalFees,
      selectedMonths,
      status: status || 'Paid',
      date: new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' }),
    });
  } catch (error) {
    console.error("Error creating payments:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

exports.calculateStudentFees = async (req, res) => {
  try {
    const { student_details_id } = req.params;
    const { months } = req.query; // Add support for months query parameter

    if (!student_details_id || isNaN(student_details_id)) {
      return res.status(400).json({ error: "Valid student_details_id is required" });
    }

    const student = await StudentDetails.findByPk(student_details_id, {
      attributes: ['user_id'],
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const userGrades = await UserGrade.findAll({
      where: { user_id: student.user_id },
      attributes: ['grade_id'],
      include: [{ model: Grade, attributes: ['id'], include: [{ model: Course, attributes: ['name'] }] }],
    });

    if (!userGrades || userGrades.length === 0) {
      return res.status(404).json({ message: "No grades found for this student" });
    }

    const gradeIds = userGrades.map(g => g.grade_id);
    const gradeFees = await GradeFee.findAll({
      where: { grade_id: gradeIds },
      attributes: ['grade_id', 'fee'],
      include: [{ model: Grade, required: true, include: [{ model: Course, required: true, attributes: ['name'] }] }],
    });

    const payments = await Payment.findAll({
      where: { student_details_id },
      attributes: ['payment_date'],
      order: [['payment_date', 'DESC']],
    });

    const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const queriedMonths = months ? months.split(',').filter(m => monthsList.includes(m)) : [];

    let totalCourseFees = 0;
    const courseFees = {};

    if (queriedMonths.length > 0) {
      queriedMonths.forEach(month => {
        courseFees[month] = {};
        gradeFees.forEach(gf => {
          if (!courseFees[month][`Grade ${gf.grade_id}`]) {
            courseFees[month][`Grade ${gf.grade_id}`] = {};
          }
          courseFees[month][`Grade ${gf.grade_id}`][gf.Grade.Course.name] = gf.fee || 1000;
          totalCourseFees += gf.fee || 1000;
        });
      });
    } else {
      // Determine the next unpaid month
      let currentMonth = format(new Date(), 'MMM');
      if (payments.length > 0) {
        const lastPaymentMonth = format(new Date(payments[0].payment_date), 'MMM');
        const lastPaidIndex = monthsList.indexOf(lastPaymentMonth);
        currentMonth = monthsList[(lastPaidIndex + 1) % 12];
      }

      courseFees[currentMonth] = {};
      gradeFees.forEach(gf => {
        if (!courseFees[currentMonth][`Grade ${gf.grade_id}`]) {
          courseFees[currentMonth][`Grade ${gf.grade_id}`] = {};
        }
        courseFees[currentMonth][`Grade ${gf.grade_id}`][gf.Grade.Course.name] = gf.fee || 1000;
        totalCourseFees += gf.fee || 1000;
      });
    }

    const hasPayments = payments.length > 0;
    const admissionFee = hasPayments ? 0 : 1000;
    const totalFees = totalCourseFees + admissionFee;

    res.json({
      student_details_id: Number(student_details_id),
      course_fees: courseFees,
      total_course_fees: totalCourseFees,
      admission_fee: admissionFee,
      total_fees: totalFees,
      last_paid_month: payments.length > 0 ? format(new Date(payments[0].payment_date), 'MMM') : null,
      selectedMonths: queriedMonths.length > 0 ? queriedMonths : [], // Add selectedMonths
    });
  } catch (error) {
    console.error("Error calculating student fees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getpayment = async (req, res) => {
  try {
    const { student_details_id } = req.params;
    const { months } = req.query;

    if (!student_details_id || isNaN(student_details_id)) {
      return res.status(400).json({ error: "Valid student_details_id is required" });
    }

    const student = await StudentDetails.findByPk(student_details_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name'],
          include: [
            {
              model: UserBranch,
              as: 'user_branch',
              required: false,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  attributes: ['branch_name'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ['student_no', 'user_id'],
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const userGrades = await UserGrade.findAll({
      where: { user_id: student.user_id },
      attributes: ['grade_id'],
      include: [{ model: Grade, attributes: ['id'], include: [{ model: Course, attributes: ['name'] }] }],
    });

    if (!userGrades || userGrades.length === 0) {
      return res.status(404).json({ message: "No grades found for this student" });
    }

    const gradeIds = userGrades.map(g => g.grade_id);
    const gradeFees = await GradeFee.findAll({
      where: { grade_id: gradeIds },
      attributes: ['grade_id', 'fee'],
      include: [{ model: Grade, required: true, include: [{ model: Course, required: true, attributes: ['name'] }] }],
    });

    const payments = await Payment.findAll({
      where: { student_details_id },
      attributes: ['payment_date', 'status'],
    });

    let totalCourseFees = 0;
    const courseFees = {};
    const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();
    const paidMonths = [...new Set(payments.filter(p => p.status === 'Paid').map(p => format(new Date(p.payment_date), 'MMM yyyy')))];

    const queriedMonths = months ? months.split(',').filter(m => monthsList.includes(m)) : [];

    if (queriedMonths.length > 0) {
      queriedMonths.forEach(month => {
        courseFees[month] = {};
        gradeFees.forEach(gf => {
          if (!courseFees[month][`Grade ${gf.grade_id}`]) {
            courseFees[month][`Grade ${gf.grade_id}`] = {};
          }
          courseFees[month][`Grade ${gf.grade_id}`][gf.Grade.Course.name] = gf.fee || 1000;
          totalCourseFees += gf.fee || 1000;
        });
      });
    } else {
      const dueMonthIndex = paidMonths.length > 0 ? (monthsList.indexOf(paidMonths[paidMonths.length - 1].split(' ')[0]) + 1) % 12 : currentMonthIndex;
      const dueMonth = monthsList[dueMonthIndex];
      monthsList.forEach(m => {
        courseFees[m] = {};
        gradeFees.forEach(gf => {
          if (!courseFees[m][`Grade ${gf.grade_id}`]) {
            courseFees[m][`Grade ${gf.grade_id}`] = {};
          }
          courseFees[m][`Grade ${gf.grade_id}`][gf.Grade.Course.name] = gf.fee || 1000;
          if (m === dueMonth && !paidMonths.some(p => p.startsWith(m))) {
            totalCourseFees += gf.fee || 1000;
          }
        });
      });
    }

    const isNewStudent = paidMonths.length === 0;
    const admissionFee = isNewStudent ? 1000 : 0;
    const totalFees = totalCourseFees + admissionFee;

    const user = student.user || {};
    const userBranch = user.user_branch && user.user_branch.length > 0 ? user.user_branch[0] : null;
    const branch = userBranch ? userBranch.branch : null;
    const full_name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null;

    res.json({
      student_details_id: Number(student_details_id),
      student_no: student.student_no || null,
      branch_name: branch ? branch.branch_name : null,
      full_name,
      course_fees: courseFees,
      total_course_fees: totalCourseFees,
      admission_fee: admissionFee,
      total_fees: totalFees,
      payments: paidMonths,
      due_month: queriedMonths.length > 0 ? null : monthsList[(monthsList.indexOf(paidMonths[paidMonths.length - 1]?.split(' ')[0] || 'Dec') + 1) % 12],
    });
  } catch (error) {
    console.error("Error calculating student fees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.calculatePendingPayments = async (req, res) => {
  try {
    const { student_details_id } = req.params;

    // Validate student ID
    if (!student_details_id || isNaN(student_details_id)) {
      return res.status(400).json({ error: "Valid student_details_id is required" });
    }

    // Fetch student details
    const student = await StudentDetails.findByPk(student_details_id, {
      include: [{ model: User, as: "user", attributes: ["id"] }],
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Fetch all payments for the student
    const payments = await Payment.findAll({
      where: { student_details_id },
      attributes: ["id", "payment_date", "amount", "status", "created_at"],
      order: [["payment_date", "DESC"]],
    });

    // Get current date and time (July 2, 2025, 08:17 AM +0530)
    const currentDate = new Date();
    const currentMonth = format(currentDate, 'MMM'); // e.g., "Jul"
    const currentYear = currentDate.getFullYear(); // 2025
    const currentDay = currentDate.getDate(); // 2

    // Determine the last paid month
    let lastPaidMonth = -1;
    let lastPaidYear = currentYear;
    if (payments.length > 0 && payments[0].payment_date) {
      const lastPaymentDate = new Date(payments[0].payment_date);
      lastPaidMonth = parseInt(format(lastPaymentDate, 'M'), 10) - 1; // 0-based month
      lastPaidYear = lastPaymentDate.getFullYear();
    }

    // Calculate pending months and their statuses
    const monthlyStatus = {};
    let pendingMonths = 0;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = format(currentDate, 'MMM yyyy'); // e.g., "Jul 2025"

    for (let i = 0; i <= currentDate.getMonth(); i++) {
      const monthDate = addMonths(startOfYear(currentDate), i);
      const monthYear = format(monthDate, 'MMM yyyy'); // Changed YYYY to yyyy
      const dueDate = endOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 10));

      const paymentForMonth = payments.find(p =>
        p.status === 'Paid' && format(new Date(p.payment_date), 'MMM yyyy') === monthYear // Changed YYYY to yyyy
      );

      if (paymentForMonth) {
        monthlyStatus[monthYear] = 'Paid';
      } else if (monthYear === currentMonthName && currentDay > 10) {
        monthlyStatus[monthYear] = 'Due';
        pendingMonths++;
      } else if (isBefore(monthDate, currentDate) && !paymentForMonth) {
        monthlyStatus[monthYear] = 'Due';
        pendingMonths++;
      } else {
        monthlyStatus[monthYear] = 'Upcoming';
      }
    }

    // Fetch grade fees for the student
    const userGrades = await UserGrade.findAll({
      where: { user_id: student.user_id },
      attributes: ["grade_id"],
      include: [{ model: Grade, attributes: ["grade_name"] }],
    });

    const gradeIds = userGrades.map((g) => g.grade_id);
    const gradeFees = await GradeFee.findAll({
      where: { grade_id: gradeIds },
      include: [{ model: Grade, required: true, include: [{ model: Course, required: true, attributes: ["name"] }] }],
    });

    let totalCourseFees = 0;
    gradeFees.forEach((fee) => {
      totalCourseFees += fee.fee || 0;
    });

    // Calculate total pending amount (fee per month * pending months)
    const monthlyFee = totalCourseFees;
    const pendingAmount = monthlyFee * pendingMonths;
    const admissionFee = payments.length === 0 ? 1000 : 0;
    const totalDue = pendingAmount + admissionFee;

    // Determine upcoming paid month (next month after current)
    let upcomingPaidMonth = currentDate.getMonth() + 1;
    let upcomingPaidYear = currentYear;
    if (upcomingPaidMonth > 11) {
      upcomingPaidMonth = 0;
      upcomingPaidYear += 1;
    }
    const upcomingMonthName = format(new Date(upcomingPaidYear, upcomingPaidMonth), 'MMMM yyyy'); // Changed YYYY to yyyy

    // Response
    return res.json({
      student_details_id: Number(student_details_id),
      last_paid_month: lastPaidMonth >= 0 ? format(new Date(lastPaidYear, lastPaidMonth), 'MMMM yyyy') : "Never", // Changed YYYY to yyyy
      pending_months: pendingMonths,
      monthly_fee: monthlyFee,
      pending_amount: pendingAmount,
      admission_fee: admissionFee,
      total_due: totalDue,
      upcoming_paid_month: upcomingMonthName,
      monthly_status: monthlyStatus,
    });
  } catch (error) {
    console.error("Error calculating pending payments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};




exports.getPaymentHistory = async (req, res) => {
  try {
    const { student_details_id } = req.params;
    const { status } = req.query;

    if (!student_details_id || isNaN(student_details_id)) {
      return res.status(400).json({ error: "Valid student_details_id is required" });
    }

    // 1. Get student and related user
    const student = await StudentDetails.findByPk(student_details_id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "first_name", "last_name"],
          include: [
            {
              model: UserBranch,
              as: "user_branch",
              required: false,
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["id", "branch_name"],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ["student_no"],
    });

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.user) return res.status(404).json({ message: "Associated user not found" });

    const branch = student.user.user_branch?.[0]?.branch;
    const branch_id = branch?.id;
    const branch_name = branch?.branch_name || null;

    // 2. Get payment records
    const payments = await Payment.findAll({
      where: { student_details_id },
      attributes: ["id", "payment_date", "amount", "status", "created_at"],
      order: [["payment_date", "DESC"]],
    });

    // 3. Get latest course and grade
    const userGrades = await UserGrade.findAll({
      where: { user_id: student.user.id },
      include: [
        {
          model: Grade,
          attributes: ["id"],
          include: [
            {
              model: Course,
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 1,
    });

    const course = userGrades.length > 0 ? userGrades[0].Grade.Course.name : null;
    const grade = userGrades.length > 0 ? userGrades[0].Grade.id : null;
    const full_name = `${student.user.first_name} ${student.user.last_name}`;

    // 4. Get fee from GradeFee table
    let monthlyFee = 0;
    if (grade && branch_id) {
      const gradeFee = await GradeFee.findOne({
        where: {
          grade_id: grade,
          branch_id: branch_id,
        },
      });
      if (gradeFee) {
        monthlyFee = gradeFee.fee;
      }
    }

    // 5. Extract paid months
    const paidPayments = payments.filter(payment =>
      payment.status.toLowerCase() === "paid" &&
      (payment.payment_date || payment.created_at)
    );

    const paidMonths = new Set(
      paidPayments.map(p =>
        moment(p.payment_date || p.created_at).format('YYYY-MM')
      )
    );

    // 6. Determine start point for pending generation
    const now = moment();
    let startGenerating;

    if (paidPayments.length > 0) {
      const latestPaid = moment.max(paidPayments.map(p =>
        moment(p.payment_date || p.created_at)
      ));
      startGenerating = latestPaid.clone().add(1, 'month').startOf('month');
    } else if (userGrades.length > 0) {
      startGenerating = moment(userGrades[0].created_at).startOf('month');
    }

    // 7. Generate pending months after 10th
    const generatedPending = [];

    if (startGenerating) {
      const currentMonth = moment().startOf('month');
      const totalMonths = currentMonth.diff(startGenerating, 'months') + 1;

      for (let i = 0; i < totalMonths; i++) {
        const month = startGenerating.clone().add(i, 'months');
        const monthStr = month.format('YYYY-MM');
        const tenth = month.clone().date(10);

        if (!paidMonths.has(monthStr) && now.isAfter(tenth, 'day')) {
          generatedPending.push({
            date: month.clone().date(11).format('YYYY-MM-DD'), // show 11th of that month
            branch: branch_name,
            payment: monthlyFee,
            status: "Pending"
          });
        }
      }
    }

    // 8. Format paid history
    const formatDate = (payment) => {
      return payment.payment_date
        ? moment(payment.payment_date).format("YYYY-MM-DD")
        : moment(payment.created_at).format("YYYY-MM-DD");
    };

    const paidHistory = paidPayments.map(payment => ({
      date: formatDate(payment),
      branch: branch_name,
      payment: payment.amount,
      status: payment.status,
    }));

    const pendingHistory = generatedPending;

    // 9. Respond
    if (status) {
      if (status.toLowerCase() === "paid") {
        return res.json({
          name: full_name,
          course: course || "Unknown",
          grade: grade || "Unknown",
          paymentHistory: paidHistory,
        });
      } else if (status.toLowerCase() === "pending") {
        return res.json({
          name: full_name,
          course: course || "Unknown",
          grade: grade || "Unknown",
          paymentHistory: pendingHistory,
        });
      } else {
        return res.status(400).json({ error: "Invalid status. Use 'paid' or 'pending'" });
      }
    } else {
      return res.json({
        name: full_name,
        course: course || "Unknown",
        grade: grade || "Unknown",
        paidHistory,
        pendingHistory
      });
    }

  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.searchPaymentsByName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Name query parameter is required" });
    }

    const students = await StudentDetails.findAll({
      include: [
        {
          model: User,
          as: "user",
          where: {
            [Op.or]: [
              { first_name: { [Op.like]: `%${name}%` } },
              { last_name: { [Op.like]: `%${name}%` } }
            ]
          },
          attributes: ["id", "first_name", "last_name"],
          include: [
            {
              model: UserBranch,
              as: "user_branch",
              required: false,
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["branch_name"],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ["id", "student_no"],
      where: id ? { id } : {},
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found with the given name" });
    }

    const paymentPromises = students.map(async (student) => {
      const payments = await Payment.findAll({
        where: { student_details_id: student.id },
        attributes: ["id", "payment_date", "amount", "status", "created_at"],
        order: [["payment_date", "DESC"]],
      });

      const full_name = `${student.user.first_name} ${student.user.last_name}`;
      const branch_name = student.user.user_branch && student.user.user_branch.length > 0
        ? student.user.user_branch[0].branch.branch_name
        : null;

      const formatDate = (payment) => {
        if (payment.payment_date) {
          return format(new Date(payment.payment_date), 'yyyy-MM-dd');
        } else {
          return format(new Date(payment.created_at), 'MMMM');
        }
      };

      const paymentHistory = payments.map(payment => ({
        date: formatDate(payment),
        branch: branch_name,
        payment: payment.amount,
        status: payment.status,
      }));

      return {
        name: full_name,
        student_details_id: student.id,
        paymentHistory,
      };
    });

    const results = await Promise.all(paymentPromises);
    res.json(results);
  } catch (error) {
    console.error("Error searching payments by name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.filterbypaidpending = async (req, res) => {
  try {
    const { name, status } = req.query;

    // Validate the name parameter
    if (!name) {
      return res.status(400).json({ error: "Name query parameter is required" });
    }

    // Fetch students based on name (first_name or last_name)
    const students = await StudentDetails.findAll({
      include: [
        {
          model: User,
          as: "user",
          where: {
            [Op.or]: [
              { first_name: { [Op.like]: `%${name}%` } },
              { last_name: { [Op.like]: `%${name}%` } }
            ]
          },
          attributes: ["id", "first_name", "last_name"],
          include: [
            {
              model: UserBranch,
              as: "user_branch",
              required: false,
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["branch_name"],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: ["id", "student_no"],
    });

    // Return 404 if no students are found
    if (!students.length) {
      return res.status(404).json({ message: "No students found with the given name" });
    }

    // Map over students to fetch their latest payment details
    const paymentPromises = students.map(async (student) => {
      let paymentsQuery = {
        where: { student_details_id: student.id },
        attributes: ["id", "payment_date", "amount", "status", "created_at"],
        order: [["created_at", "DESC"]],
        limit: 1,
      };

      // Apply status filter if provided
      if (status) {
        status = status.toLowerCase();
        if (status === "paid") {
          paymentsQuery.where = {
            ...paymentsQuery.where,
            payment_date: { [Op.not]: null },
            status: { [Op.eq]: "paid" },
          };
        } else if (status === "pending") {
          paymentsQuery.where = {
            ...paymentsQuery.where,
            payment_date: { [Op.is]: null },
            status: { [Op.eq]: "pending" },
          };
        } else {
          return res.status(400).json({ error: "Invalid status. Use 'paid' or 'pending'" });
        }
      }

      const payments = await Payment.findAll(paymentsQuery);

      // Construct full name and branch name
      const full_name = `${student.user.first_name} ${student.user.last_name}`;
      const branch_name = student.user.user_branch && student.user.user_branch.length > 0
        ? student.user.user_branch[0].branch.branch_name
        : null;

      // Format date function
      const formatDate = (payment) => {
        if (payment && payment.payment_date) {
          return format(new Date(payment.payment_date), 'yyyy-MM-dd');
        } else {
          return format(new Date(payment.created_at), 'MMMM YYYY');
        }
      };

      // Get latest payment details
      const latestPayment = payments.length > 0 ? payments[0] : null;
      const paymentDetails = latestPayment
        ? {
            date: formatDate(latestPayment),
            branch: branch_name,
            payment: latestPayment.amount || 0,
            status: latestPayment.status,
          }
        : null;

      return {
        name: full_name,
        student_details_id: student.id,
        latestPayment: paymentDetails,
      };
    });

    // Resolve all payment promises and send the response
    const results = await Promise.all(paymentPromises);
    res.json(results);
  } catch (error) {
    console.error("Error searching payments by name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.filterstatus = async (req, res) => {
  try {
    const { status, name } = req.query;
    const currentDate = new Date();

    const students = await StudentDetails.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["first_name", "last_name"],
        },
      ],
      attributes: ["id"],
      where: name
        ? {
            [Op.or]: [
              Sequelize.where(
                Sequelize.col("user.first_name"),
                "LIKE",
                `%${name}%`
              ),
              Sequelize.where(
                Sequelize.col("user.last_name"),
                "LIKE",
                `%${name}%`
              ),
            ],
          }
        : {},
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found" });
    }

    const paymentPromises = students.map(async (student) => {
      const paidPayment = await Payment.findOne({
        where: { student_details_id: student.id, status: "paid" },
        attributes: ["payment_date", "amount", "status", "created_at"],
        order: [["payment_date", "DESC"], ["created_at", "DESC"]],
      });

      const pendingPayment = await Payment.findOne({
        where: {
          student_details_id: student.id,
          status: "pending",
          payment_date: null,
        },
        attributes: ["payment_date", "amount", "status", "created_at"],
        order: [["created_at", "DESC"]],
      });

      const name = `${student.user.first_name} ${student.user.last_name}`;

      const formatDate = (payment) =>
        payment?.payment_date
          ? format(new Date(payment.payment_date), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-01");

      let paymentDetails = null;

      if (status?.toLowerCase() === "paid" && paidPayment) {
        paymentDetails = {
          paydate: formatDate(paidPayment),
          amount: paidPayment.amount,
          status: paidPayment.status,
        };
      } else if (status?.toLowerCase() === "pending") {
        if (pendingPayment) {
          paymentDetails = {
            paydate: formatDate(pendingPayment),
            amount: pendingPayment.amount || 0,
            status: pendingPayment.status,
          };
        } else if (paidPayment) {
          const lastPaidMonth = new Date(paidPayment.payment_date).getMonth();
          const lastPaidYear = new Date(paidPayment.payment_date).getFullYear();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          if (
            lastPaidYear < currentYear ||
            (lastPaidYear === currentYear && lastPaidMonth < currentMonth)
          ) {
            paymentDetails = {
              paydate: format(new Date(), "yyyy-MM-01"),
              amount: paidPayment.amount || 0,
              status: "pending",
            };
          }
        }
      } else {
        if (
          paidPayment &&
          (!pendingPayment ||
            paidPayment.created_at >= pendingPayment.created_at)
        ) {
          paymentDetails = {
            paydate: formatDate(paidPayment),
            amount: paidPayment.amount,
            status: paidPayment.status,
          };

          const lastPaidMonth = new Date(paidPayment.payment_date).getMonth();
          const lastPaidYear = new Date(paidPayment.payment_date).getFullYear();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          if (
            lastPaidYear < currentYear ||
            (lastPaidYear === currentYear && lastPaidMonth < currentMonth)
          ) {
            paymentDetails = {
              paydate: format(new Date(), "yyyy-MM-01"),
              amount: paidPayment.amount || 0,
              status: "pending",
            };
          }
        } else if (pendingPayment) {
          paymentDetails = {
            paydate: formatDate(pendingPayment),
            amount: pendingPayment.amount || 0,
            status: pendingPayment.status,
          };
        }
      }

      return { name, latestPayment: paymentDetails };
    });

    const results = await Promise.all(paymentPromises);

    if (status?.toLowerCase() === "pending") {
      return res.json(
        results.filter((student) => student.latestPayment?.status === "pending")
      );
    }

    res.json(results);
  } catch (error) {
    console.error("Error searching payments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: StudentDetails,
          as: 'student_details',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name'],
              include: [
                {
                  model: UserBranch,
                  as: 'user_branch',
                  include: [
                    { model: Branch, as: 'branch', attributes: ['branch_name'] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    res.json(payments.map(p => ({
      id: p.id,
      student_details_id: p.student_details_id,
      payment_date: p.payment_date,
      status: p.status,
      amount: p.amount,
      full_name: `${p.student_details.user.first_name} ${p.student_details.user.last_name}` || 'Unknown',
      branch_name: p.student_details.user.user_branch?.[0]?.branch?.branch_name || null,
    })));
  } catch (error) {
    console.error("Error fetching all payments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { status: 'Pending' },
      include: [
        {
          model: StudentDetails,
          as: 'student_details',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name'],
              include: [
                {
                  model: UserBranch,
                  as: 'user_branch',
                  include: [
                    { model: Branch, as: 'branch', attributes: ['branch_name'] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    res.json(payments.map(p => ({
      id: p.id,
      student_details_id: p.student_details_id,
      payment_date: p.payment_date,
      status: p.status,
      amount: p.amount,
      full_name: `${p.student_details.user.first_name} ${p.student_details.user.last_name}` || 'Unknown',
      branch_name: p.student_details.user.user_branch?.[0]?.branch?.branch_name || null,
    })));
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getPaidPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { status: 'Paid' },
      include: [
        {
          model: StudentDetails,
          as: 'student_details',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name'],
              include: [
                {
                  model: UserBranch,
                  as: 'user_branch',
                  include: [
                    { model: Branch, as: 'branch', attributes: ['branch_name'] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    res.json(payments.map(p => ({
      id: p.id,
      student_details_id: p.student_details_id,
      payment_date: p.payment_date,
      status: p.status,
      amount: p.amount,
      full_name: `${p.student_details.user.first_name} ${p.student_details.user.last_name}` || 'Unknown',
      branch_name: p.student_details.user.user_branch?.[0]?.branch?.branch_name || null,
    })));
  } catch (error) {
    console.error("Error fetching paid payments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.getPayments = async (req, res) => {
  try {
    const { state, status } = req.query; // status can be 'Paid', 'Pending', or undefined for all
    const where = status && status !== 'All' ? { status } : {};

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: StudentDetails,
          as: 'student_details',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true,
              attributes: ['first_name', 'last_name', 'status'],
              where: state && state !== 'All' ? { status: state } : {},
              include: [
                {
                  model: UserBranch,
                  as: 'user_branch',
                  required: false,
                  include: [{ model: Branch, as: 'branch', attributes: ['branch_name'], required: false }],
                },
              ],
            },
          ],
        },
      ],
    });

    const responseData = payments.map(p => ({
      id: p.id,
      student_details_id: p.student_details_id,
      payment_date: p.payment_date,
      status: p.status,
      amount: p.amount,
      full_name: `${p.student_details.user.first_name} ${p.student_details.user.last_name}` || 'Unknown',
      branch_name: p.student_details.user.user_branch?.[0]?.branch?.branch_name || null,
      state: p.student_details.user.status,
    }));

    res.json(responseData);
  } catch (error) {
    console.error(`Error fetching payments (${status || 'all'}):`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.searchPayments = async (req, res) => {
  try {
    const { state, status, search } = req.query;

    const whereClause = {};
    if (state && state !== 'State') {
      whereClause['$student_details.user.status$'] = state;
    }

    const searchCondition = search
      ? {
          [Op.or]: [
            { '$student_details.user.first_name$': { [Op.like]: `%${search}%` } },
            { '$student_details.user.last_name$': { [Op.like]: `%${search}%` } },
            { payment_date: { [Op.like]: `%${search}%` } },
            { amount: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const payments = await Payment.findAll({
      where: { ...whereClause, ...searchCondition },
      include: [
        {
          model: StudentDetails,
          as: 'student_details',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true,
              attributes: ['id', 'first_name', 'last_name', 'status'],
              include: [
                {
                  model: UserBranch,
                  as: 'user_branch',
                  required: false,
                  include: [{ model: Branch, as: 'branch', attributes: ['id', 'branch_name'], required: false }],
                },
              ],
            },
          ],
        },
      ],
    });

    const paidData = payments.map((p) => ({
      id: p.id,
      student_details_id: p.student_details_id,
      payment_date: p.payment_date,
      status: p.status,
      amount: p.amount,
      full_name: `${p.student_details.user.first_name} ${p.student_details.user.last_name}`,
      branch_name: p.student_details.user.user_branch?.[0]?.branch?.branch_name || 'Unknown',
      state: p.student_details.user.status,
    }));

    const generatedPending = [];

    for (const p of payments) {
      const user = p.student_details.user;
      const userId = user.id;
      const branch = user.user_branch?.[0]?.branch;
      const branchId = branch?.id || null;
      const branchName = branch?.branch_name || 'Unknown';

      if (user.status !== 'active') {
        console.log(`Skipping inactive student: ${user.first_name} ${user.last_name} (ID: ${userId})`);
        continue;
      }

      const userGrades = await UserGrade.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Grade,
            include: [{ model: Course, attributes: ['name'] }],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 1,
      });

      let monthlyFee = 0;
      let gradeId = null;
      let courseName = 'Unknown';
      let gradeName = 'Unknown';
      let gradeCreatedAt = moment().startOf('month'); // Default to current month if invalid

      if (userGrades.length > 0) {
        const userGrade = userGrades[0];
        gradeId = userGrade.Grade?.id;
        courseName = userGrade.Grade?.Course?.name || 'Unknown';
        gradeName = userGrade.Grade?.name || 'Unknown';
        gradeCreatedAt = moment(userGrade.created_at).isValid() ? moment(userGrade.created_at) : moment().startOf('month');
        console.log(`Found UserGrade for student ID: ${userId}, Grade: ${gradeName}, Course: ${courseName}`);
      } else {
        console.warn(`No UserGrade found for student ID: ${userId}. Using fallback fee.`);
      }

      if (gradeId && branchId) {
        const gradeFee = await GradeFee.findOne({ where: { grade_id: gradeId, branch_id: branchId } });
        if (gradeFee) {
          monthlyFee = gradeFee.fee;
          console.log(`Found GradeFee: ${monthlyFee} for Grade ID: ${gradeId}, Branch ID: ${branchId}`);
        } else {
          console.warn(`No GradeFee found for Grade ID: ${gradeId}, Branch ID: ${branchId}. Using fallback fee.`);
        }
      } else {
        console.warn(`Missing gradeId (${gradeId}) or branchId (${branchId}) for student ID: ${userId}. Using fallback fee.`);
      }

      if (monthlyFee === 0) {
        const latestPayment = payments
          .filter((pay) => pay.student_details_id === p.student_details_id && pay.status === 'Paid')
          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];
        monthlyFee = latestPayment?.amount || 1000;
        console.log(`Using fallback fee: ${monthlyFee} for student ID: ${userId}`);
      }

      const studentPayments = payments.filter((pay) => pay.student_details_id === p.student_details_id && pay.status === 'Paid');

      const paidMonths = new Set(
        studentPayments.map((pay) =>
          moment(pay.payment_date || pay.created_at).format('YYYY-MM')
        )
      );

      let startGenerating = null;
      if (studentPayments.length > 0) {
        const latestPaid = moment.max(
          studentPayments.map((pay) => moment(pay.payment_date || pay.created_at))
        );
        startGenerating = latestPaid.clone().add(1, 'month').startOf('month');
      } else {
        startGenerating = gradeCreatedAt.clone().startOf('month');
      }

      if (startGenerating) {
        const now = moment().startOf('month'); // Current month: July 2025
        let currentMonth = startGenerating;
        while (currentMonth.isSameOrBefore(now)) {
          const monthStr = currentMonth.format('YYYY-MM');
          if (!paidMonths.has(monthStr)) {
            generatedPending.push({
              id: `pending-${p.student_details_id}-${monthStr}`,
              student_details_id: p.student_details_id,
              payment_date: currentMonth.format('YYYY-MM-01'),
              status: 'Pending',
              amount: monthlyFee,
              full_name: `${user.first_name} ${user.last_name}`,
              branch_name: branchName,
              state: user.status,
              course_name: courseName,
              grade_name: gradeName,
            });
            console.log(`Generated pending payment for ${user.first_name} ${user.last_name}: ${monthStr}, Amount: ${monthlyFee}`);
          }
          currentMonth.add(1, 'month');
        }
      }
    }

    const allPayments = [...paidData, ...generatedPending];

    const finalData = status && status !== 'All'
      ? allPayments.filter((p) => p.status.toLowerCase() === status.toLowerCase())
      : allPayments;

    console.log(`Final payments:`, JSON.stringify(finalData, null, 2));

    return res.json(finalData);
  } catch (error) {
    console.error('Error in searchPayments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};