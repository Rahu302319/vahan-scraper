import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "72.61.225.29",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "vahan_user",
  password: process.env.MYSQL_PASSWORD || "Rahul@552233385626",
  database: process.env.MYSQL_DATABASE || "vahan",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});
