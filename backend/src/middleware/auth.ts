import { Request, Response, NextFunction } from "express";

export const fakeAuth = (req: any, res: Response, next: NextFunction) => {

  const role = req.headers["x-role"];

  req.user = {
    id: 1,
    role: role || "field"
  };

  next();
};