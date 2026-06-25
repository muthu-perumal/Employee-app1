import { setServers } from "dns";
import mongoose from "mongoose";

// Windows often blocks Node.js SRV DNS on router DNS — use public DNS for Atlas.
setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async (connectionString, dbName) => {
  const allowInvalidTls =
    process.env.MONGODB_TLS_ALLOW_INVALID === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.MONGODB_TLS_ALLOW_INVALID !== "false");

  const options = {
    dbName,
    serverSelectionTimeoutMS: 30000,
    family: 4,
  };

  if (allowInvalidTls) {
    options.tlsAllowInvalidCertificates = true;
  }

  return mongoose.connect(connectionString, options);
};

export default connectDB;
