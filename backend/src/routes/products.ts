import { Router } from "express";
import { getProducts, createProduct } from "../controllers/products.controller";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);

export default router;
