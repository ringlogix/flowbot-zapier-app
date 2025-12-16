import * as dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'https://68d85d133083.ngrok-free.app/',
  COMPANY_NAME: process.env.COMPANY_NAME || 'Flowbot',
  SOURCE_TYPE: process.env.SOURCE_TYPE || 'N8n',
};