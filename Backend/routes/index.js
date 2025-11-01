
import express from 'express';
// Imports
// const auth = require("../middlewares/auth");
// const admin = require('../middlewares/admin');
import teacherRoutes from "./Teacher.routes.js";
import subjectRoutes from "./Subject.routes.js";
import studentRoutes from "./Student.routes.js";
import lectureRoutes from "./Lecture.routes.js";
import organisationRoutes from "./Organisation.routes.js";
import departmentRoutes from "./Department.routes.js";

export default function (app) {
  const router = express.Router();
  app.use(router);

  router.get("/", (req, res) => res.status(200).json({ type: "success", message: "Server is running" }));

  router.use("/organisation",organisationRoutes);
  router.use("/department",departmentRoutes);
  router.use("/teacher", teacherRoutes);
  router.use("/subject", subjectRoutes);
  router.use("/student", studentRoutes);
  router.use("/lecture", lectureRoutes);

  // 404 not found
  router.get("/*", (req, res) => res.status(404).json({ type: 'error', message: '404 not found!' }));
}