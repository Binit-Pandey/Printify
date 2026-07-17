import { Request, Response, NextFunction } from 'express';

type RouteFn = (req: Request, res: Response, next: NextFunction) => void;

export const wrap = (fn: RouteFn) => (req: Request, res: Response, next: NextFunction) => {
  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};
