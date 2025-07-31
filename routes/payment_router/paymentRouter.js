const express = require("express");
const router = express.Router();
const PaymentController = require("../../controllers/payment_controller/paymentController"); // Corrected to match file name

// Define routes
router.post("/payment/:student_details_id", PaymentController.createPayment);
router.get("/student/search", PaymentController.searchStudents); // Search 
router.get('/fees/:student_details_id', PaymentController.calculateStudentFees);
router.get('/payment/:student_details_id', PaymentController.getpayment);
router.get('/payments/:student_details_id/calculate', PaymentController.calculatePendingPayments);
router.get('/payment-history/:student_details_id', PaymentController.getPaymentHistory);
router.get('/payment-history/search/:student_details_id', PaymentController.searchPaymentsByName);
router.get('/payments/search', PaymentController.filterbypaidpending);
router.get('/filterstatus/search', PaymentController.filterstatus);
router.get('/students', PaymentController.getAllStudents);

// New endpoints to match frontend requirements
router.get('/payments', PaymentController.getAllPayments);
router.get('/pending-payments', PaymentController.getPendingPayments);
router.get('/paid-payments', PaymentController.getPaidPayments);
router.get('/allpayments', PaymentController.getPayments);
router.get('/searchmain', PaymentController.searchPayments);






module.exports = router;