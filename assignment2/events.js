const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("time", (message) => {
  // this registers a listener
  console.log("Time received:", message);
});

setInterval(() => {
  let now = new Date();
  let time = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  ].map(n => String(n).padStart(2, "0")).join(":");  
  emitter.emit("time", time);
}, 5000);

module.exports = emitter;