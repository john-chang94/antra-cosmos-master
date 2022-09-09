const { init: initShuttleDb } = require("./dbs/shuttle");
const createSpaceTravelEmitter = require("./private/space-travel-emitter");
const log = require("./logger");
const shuttleUtil = require("./util/shuttle");
const cadet = require("./cadet");

const listen = async () => {
  const shuttleDb = await initShuttleDb();
  const spaceTravelEmitter = createSpaceTravelEmitter();
  let totalCrewCount = 0;
  spaceTravelEmitter.on("space-request", (evt) => {
    log("space-request", evt);
    ++totalCrewCount;
    // console.log('SHUTTLEDB ON LISTEN', shuttleDb)
    onSpaceTravelRequested({ shuttleDb, ...evt });
  });
  spaceTravelEmitter.on("end", async (evt) => {
    shuttleUtil.validateShuttles({
      shuttleMap: await shuttleDb.read(),
      crewCount: totalCrewCount,
    });
    log(
      [
        "no more space requests, exiting.",
        `db can be viewed: ${shuttleDb.getDbFilename()}`,
      ].join(" ")
    );
  });
};

const onSpaceTravelRequested = async ({ shuttleDb, cosmonautId }) => {
  const shuttlesArr = [];
  const shuttles = await shuttleDb.read();
  // console.log('SHUTTLES', shuttles)
  Object.keys(shuttles).map((item) => {
    shuttlesArr.push(JSON.parse(shuttles[item]));
  });
  const availableShuttle = shuttlesArr.find(({ date, remainingCapacity }) => {
    console.log(date, remainingCapacity);
    date >= 0 && remainingCapacity > 0;
  });
  console.log("AVAILABLE SHUTTLE", availableShuttle);
  if (!availableShuttle) {
    throw new Error(
      `unable to schedule cosmonautId ${cosmonautId}, no shuttles available`
    );
  }
  log(
    `found shuttle for cosmonautId ${cosmonautId}, shuttle ${availableShuttle.name}`
  );
  --availableShuttle.remainingCapacity;
  availableShuttle.crew.push(cosmonautId);
  await shuttleDb.write(availableShuttle.name, availableShuttle);
  await cadet.logWelcomeLetter({ cosmonautId, shuttle: availableShuttle });
};

module.exports = {
  listen,
};
