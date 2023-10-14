const express = require("express");
const routes = require("./routes");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const bodyParser = require("body-parser");
const xss = require("xss-clean");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("cookie-session");

const app = express();

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(mongoSanitize());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());

app.use(
  session({
    secret: "keyboard cat",
    proxy: true,
    resave: true,
    saveUnintialized: true,
    cookie: {
      secure: false,
    },
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP, Kindly try again in an hour time",
});

app.use("/moms-meet", limiter);

app.use(xss());

app.use(routes);

module.exports = app;
