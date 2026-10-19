import { Elysia } from "elysia";
import { createReadingRoute } from "./routes/create-reading.route";
import { searchPlacesRoute } from "./routes/search-places.route";
import { sendChatMessageRoute } from "./routes/send-chat-message.route";
import { startCheckoutRoute } from "./routes/start-checkout.route";

export const readingRouter = new Elysia({ prefix: "/readings" })
    .use(createReadingRoute)
    .use(searchPlacesRoute)
    .use(startCheckoutRoute)
    .use(sendChatMessageRoute);
