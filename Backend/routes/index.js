
import express from 'express';
// Imports
import authRoutes from "./auth.routes.js";
import userRoutes from "./User.routes.js";
import subjectRoutes from "./Subject.routes.js";
import studentRoutes from "./Student.routes.js";
import lectureRoutes from "./Lecture.routes.js";
import organisationRoutes from "./Organisation.routes.js";
import departmentRoutes from "./Department.routes.js";
import dashboardRoutes from "./Dashboard.routes.js";

export default function (app) {
  const router = express.Router();
  app.use(router);

  router.get("/", (req, res) => res.status(200).json({ type: "success", message: "Server is running" }));

  router.use("/auth", authRoutes); // Auth Routes
  router.use("/organisation", organisationRoutes);
  router.use("/department", departmentRoutes);
  router.use("/users", userRoutes); // Renamed from teacher to users
  router.use("/subject", subjectRoutes);
  router.use("/student", studentRoutes);
  router.use("/lecture", lectureRoutes);
  router.use("/stats", dashboardRoutes);

  // 404 not found
  router.get("/*", (req, res) => res.status(404).json({ type: 'error', message: '404 not found!' }));
}