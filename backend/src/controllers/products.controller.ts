import { Request, Response } from "express";

let products: any[] = [];

export const getProducts = (_: Request, res: Response) => {
  res.json(products);
};

export const createProduct = (req: Request, res: Response) => {
  const product = {
    id: crypto.randomUUID(),
    ...req.body
  };
  products.push(product);
  res.status(201).json(product);
};
