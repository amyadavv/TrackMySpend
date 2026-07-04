import mongoose from "mongoose";

const uri =
  "mongodb+srv://amityadav010213:%40SWDeveloper0505@cluster0.j3bqgcz.mongodb.net/trackmyspend";

try {
  await mongoose.connect(uri);
  console.log("Connected!");
  process.exit(0);
} catch (err) {
  console.error(err);
}