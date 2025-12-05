import winston from 'winston';
import { config } from '../config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Base transports array - always include console in development
const transports: winston.transport[] = [];

// Only add file transports in production to avoid buffer issues in development
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

export const logger = winston.createLogger({
  level: config.debug ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'sankhya-mercos-integration' },
  transports,
});

if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export const logOperation = (
  operation: string,
  status: 'success' | 'error' | 'warning' | 'info',
  message: string,
  metadata?: any
) => {
  const logData = {
    operation,
    status,
    message,
    ...metadata
  };

  switch (status) {
    case 'error':
      logger.error(logData);
      break;
    case 'warning':
      logger.warn(logData);
      break;
    case 'info':
      logger.info(logData);
      break;
    default:
      logger.info(logData);
  }
};