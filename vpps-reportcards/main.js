import './style.css';
import { PDFDocument } from 'pdf-lib';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

document.querySelector('#app').innerHTML = `
  <div>
    <h1>VPPS Report Cards Generator</h1>
    <p>Dependencies loaded. Ready to build.</p>
  </div>
`;
