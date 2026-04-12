import path from "node:path";

export const dataPaths = {
  students: path.join(process.cwd(), "data", "students.json"),
  classes: path.join(process.cwd(), "data", "classes.json"),
  notifications: path.join(process.cwd(), "data", "notifications.json"),
};
