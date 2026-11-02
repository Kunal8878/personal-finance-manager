import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Secure server logging
  console.error(`[Error] ${req.method} ${req.url} - ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || 500;
  const userMessage = err.isOperational 
    ? err.message 
    : 'An unexpected error occurred while processing your request. Please try again later.';

  res.status(statusCode).json({
    success: false,
    error: userMessage
  });
};
