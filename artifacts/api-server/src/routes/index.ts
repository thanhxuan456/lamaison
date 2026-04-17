import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hotelsRouter from "./hotels";
import roomsRouter from "./rooms";
import bookingsRouter from "./bookings";
import chatRouter from "./chat";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hotelsRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(chatRouter);
router.use(usersRouter);

export default router;
