/**
 * PDF.js Configuration
 * 
 * Configure the PDF.js worker for react-pdf library.
 * Using local worker from node_modules for better reliability.
 */

import { pdfjs } from 'react-pdf';

// Use local worker file from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default pdfjs;
