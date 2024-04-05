require("dotenv").config();
const express = require("express");
const postgres = require("postgres");

const app = express();
const sql = postgres(process.env.POSTGRES);
const port = process.env.PORT;

app.get("/", async (req, res) => {
  var lists = await sql`SELECT x.* FROM mobile_app_sample_data x`;
  // console.log(lists);

  res.json(lists);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
