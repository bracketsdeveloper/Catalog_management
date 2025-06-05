const mongoose = require("mongoose");
const Event = require("../models/Event");

async function migrateEvents() {
  try {
    await mongoose.connect("mongodb+srv://bharathac7:20190140752@mernecommerce.rrahaka.mongodb.net/ACE_CATALOG?retryWrites=true&w=majority&appName=ACE_CATALOG JWT_SECRET=HELLOWORLD", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const events = await Event.find({}).lean();

    for (const event of events) {
      if (event.potentialClient) {
        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              company: event.potentialClient,
              companyType: "Potential Client",
              companyName: event.potentialClientName,
            },
            $unset: {
              potentialClient: "",
              potentialClientName: "",
            },
          }
        );
        console.log(`Migrated event ${event._id}`);
      }
    }

    console.log("Migration completed");
    mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    mongoose.disconnect();
  }
}

migrateEvents();