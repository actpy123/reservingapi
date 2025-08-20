import mongoose from "mongoose";

const mongoConnect = async () => {
  try {
    await mongoose.connect(`mongodb://localhost:27017/reserve_db`, {
      connectTimeoutMS: 6000000, // or higher
    });
  } catch (error) {
    console.log(error);
  }
};
export default mongoConnect;
