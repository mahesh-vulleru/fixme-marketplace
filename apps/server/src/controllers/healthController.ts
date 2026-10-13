import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { HealthCheckResponse } from '@fixme/api-contracts';
import { env } from '../config/env';

export class HealthController {
  public static getHealth(req: Request, res: Response): void {
    const isDbConnected = mongoose.connection.readyState === 1;

    const payload: HealthCheckResponse = {
      success: true,
      data: {
        status: isDbConnected ? 'ok' : 'degraded',
        service: 'fixme-api',
        version: '1.0.0',
        environment: env.NODE_ENV,
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
      message: 'FixMe.com API is operational',
      requestId: req.requestId,
    };

    res.status(200).json(payload);
  }
}

