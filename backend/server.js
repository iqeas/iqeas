import app from "./src/v1/app.js";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT;
const base_url = process.env.API_BASE_URL;

app.get("/", (req, res) => {
  res.json({ active: "true", status: "200" });
});

app.listen(port, () => {
  console.log(`\x1b[34m[+] Server running on ${port} ==> ${base_url}\x1b[0m`);
});

