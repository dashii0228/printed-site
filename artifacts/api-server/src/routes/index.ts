import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import productsRouter from "./products";
import portfolioRouter from "./portfolio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(productsRouter);
router.use(portfolioRouter);

export default router;
