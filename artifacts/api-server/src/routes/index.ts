import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hotelsRouter from "./hotels";
import roomsRouter from "./rooms";
import bookingsRouter from "./bookings";
import chatRouter from "./chat";
import usersRouter from "./users";
import otaRouter from "./ota";
import guestsRouter from "./guests";
import menuItemsRouter from "./menu-items";
import roomOrdersRouter from "./room-orders";
import invoicesRouter from "./invoices";
import settingsRouter from "./settings";
import contactMessagesRouter from "./contact-messages";
import blogPostsRouter from "./blog-posts";
import paymentsRouter from "./payments";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(paymentsRouter);
router.use(integrationsRouter);
router.use(healthRouter);
router.use(hotelsRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(chatRouter);
router.use(usersRouter);
router.use(otaRouter);
router.use(guestsRouter);
router.use(menuItemsRouter);
router.use(roomOrdersRouter);
router.use(invoicesRouter);
router.use(settingsRouter);
router.use(contactMessagesRouter);
router.use(blogPostsRouter);

export default router;
