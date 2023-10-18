const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const { Server } = require("socket.io");

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

dotenv.config();

const http = require("http");
const server = http.createServer(app);

// Schemas
const modelUser = require("./models/user");
const OneToOneMessage = require("./models/OneToOneMessage");
const FriendRequest = require("./models/friendRequest");
const PostSchema = require("./models/post");
const mediaSchema = require("./models/media");
const commentSchema = require("./models/comment");
const likeSchema = require("./models/like");

// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE", "PUT", "UPDATE"],
  },
});

// const DB = process.env.DB_URI.replace("<PASSWORD>", process.env.DB_PASSWORD);
const DB_URI = `mongodb://${process.env.DB_USER}:${encodeURIComponent(
  process.env.DB_PASSWORD
)}@localhost:27017/${process.env.DB_NAME}`;

mongoose
  .connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    //  serverSelectionTimeoutMS: 5000, // Set a custom timeout value in milliseconds
    // socketTimeoutMS: 45000, // Set a custom socket timeout value in milliseconds
  })
  .then((con) => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

// Listen for when the client connects via socket.io-client
io.on("connection", async (socket) => {
  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];

  const socket_id = socket.id;

  console.log(`User connected ${socket_id}`);

  if (user_id != null && Boolean(user_id)) {
    try {
      modelUser.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
    }
  }

  //  socket event listeners
  socket.on("friend_request", async (data) => {
    const to = await modelUser.findById(data.to).select("socket_id");
    const from = await modelUser.findById(data.from).select("socket_id");

    // create a friend request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });
    // emit event request received to recipient
    io.to(to?.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });
    io.to(from?.socket_id).emit("request_sent", {
      message: "Request Sent successfully!",
    });
  });

  socket.on("accept_request", async (data) => {
    // accept friend request => add ref of each other in friends array
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await modelUser.findById(request_doc.sender);
    const receiver = await modelUser.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  });

  socket.on("get_direct_conversations", async ({ user_id }, callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName avatar _id email status");

    // db.books.find({ authors: { $elemMatch: { name: "John Smith" } } })

    console.log(existing_conversations);

    callback(existing_conversations);
  });

  socket.on("start_conversation", async (data) => {
    // data: {to: from:}

    const { to, from } = data;

    // check if there is any existing conversation

    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log(existing_conversations[0], "Existing Conversation");

    // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);

      socket.emit("start_chat", new_chat);
    }
    // if yes => just emit event "start_chat" & send conversation details as payload
    else {
      socket.emit("start_chat", existing_conversations[0]);
    }
  });

  socket.on("get_messages", async (data, callback) => {
    try {
      const conversation = await OneToOneMessage.findById(data.conversation_id);
      if (conversation && conversation.messages) {
        // If conversation is found and has messages, send the messages to the callback
        callback(conversation.messages);
      } else {
        // If conversation or messages are not found, send an appropriate error response
        callback({ error: "Conversation or messages not found" });
      }
    } catch (error) {
      console.log(error);
      // Handle other errors, if any
      callback({ error: "Internal server error" });
    }
  });

  socket.on("text_message", async (data) => {
    console.log("Received message:", data);

    // data: {to, from, text}

    const { message, conversation_id, from, to, type } = data;

    const to_user = await modelUser.findById(to);
    const from_user = await modelUser.findById(from);

    // message => {to, from, type, created_at, text, file}

    const new_message = {
      to: to,
      from: from,
      type: type,
      created_at: Date.now(),
      text: message,
    };

    try {
      // fetch OneToOneMessage Doc & push a new message to the existing conversation
      const chat = await OneToOneMessage.findById(conversation_id);

      // Check if the conversation exists before accessing its messages property
      if (chat && chat.messages) {
        chat.messages.push(new_message);
        // save to db`
        await chat.save({ new: true, validateModifiedOnly: true });

        // emit incoming_message -> to user
        io.to(to_user?.socket_id).emit("new_message", {
          conversation_id,
          message: new_message,
        });

        // emit outgoing_message -> from user
        io.to(from_user?.socket_id).emit("new_message", {
          conversation_id,
          message: new_message,
        });
      } else {
        // Handle the case where the conversation or messages are not found
        console.error(
          "Conversation not found for conversation_id:",
          conversation_id
        );
      }
    } catch (error) {
      // Handle other errors, if any
      console.error(error);
    }
  });

  // handle Media/Document Message
  socket.on("file_message", (data) => {
    console.log("Received message:", data);

    // data: {to, from, text, file}

    // Get the file extension
    const fileExtension = path.extname(data.file.name);

    // Generate a unique filename
    const filename = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

    // upload file to cloud

    // create a new conversation if its doesn't exists yet or add a new message to existing conversation

    // save to db

    // emit incoming_message -> to user

    // emit outgoing_message -> from user
  });

  socket.on("end", async (data) => {
    // Find user by ID and set status as offline

    if (data.user_id) {
      await modelUser.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

    // broadcast to all conversation rooms of this user that this user is offline (disconnected)

    console.log("closing connection");
    socket.disconnect(0);
  });
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
