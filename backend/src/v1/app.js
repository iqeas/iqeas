import express from "express";
import authRoute from "./routes/auth.routes.js";
import userRoute from "./routes/user.route.js";
import projectRoute from "./routes/projects.route.js";
import projectMoreInfoRoute from "./routes/projectMoreInfo.route.js";
import estimationRoute from "./routes/estimation.route.js";
import projectTimelineRoute from "./routes/projectTimeline.routes.js";
import deliverablesRoute from "./routes/deliverables.route.js";
import teamsRoute from "./routes/teams.route.js";
import taskRoute from "./routes/task.route.js";
import taskActivityLogRoute from "./routes/task_activity_log.route.js";
import chatRoute from "./routes/chat.route.js";
import uploadFileRoute from "./routes/uploadfiles.route.js";
import searchRoute from "./routes/search.route.js";
import workflowRoute from "./routes/workflow.route.js";

import cors from "cors"; // <-- Import cors

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1", authRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", projectRoute);
app.use("/api/v1", projectMoreInfoRoute);
app.use("/api/v1", estimationRoute);
app.use("/api/v1", projectTimelineRoute);
app.use("/api/v1", deliverablesRoute);
app.use("/api/v1", teamsRoute);
app.use("/api/v1", taskRoute);
app.use("/api/v1", taskActivityLogRoute);
app.use("/api/v1", chatRoute);
app.use("/api/v1", uploadFileRoute);
app.use("/api/v1", searchRoute);
app.use("/api/v1", workflowRoute);

export default app;
