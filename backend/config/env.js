import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly resolve the path to the backend/.env file relative to this directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Environment variables loaded successfully from resolved path.');
