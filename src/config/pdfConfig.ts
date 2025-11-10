/**
 * PDF.js Configuration
 * 
 * Configure the PDF.js worker for react-pdf library.
 * Using local worker from node_modules for better reliability.
 */

import { pdfjs } from 'react-pdf';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use the bundled worker URL emitted by Vite
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export default pdfjs;
