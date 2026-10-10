import * as XLSX from 'xlsx';

export interface ChunkInfo {
  file: File;
  chunkIndex: number;
  totalChunks: number;
  startRow: number;
  endRow: number;
  rowCount: number;
}

export interface PrepareResult {
  isChunked: boolean;
  totalRows: number;
  chunks: ChunkInfo[];
}

/**
 * Splits CSV text by lines while respecting quoted multi-line fields.
 */
export function splitCsvLines(csvText: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '""';
        i++; // skip escaped quote
        continue;
      }
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Prepares a voter file for upload.
 * If file has <= chunkSize rows, returns the original file directly.
 * If file has > chunkSize rows (e.g. 3.5 lakh data), divides it into safe 20,000-record chunks
 * to prevent proxy timeouts (504/ERR_NETWORK) and server memory limits.
 */
export async function prepareVoterFile(
  file: File,
  chunkSize: number = 20000,
  onProgress?: (message: string) => void
): Promise<PrepareResult> {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const baseName = file.name.slice(0, file.name.lastIndexOf('.'));

  let csvContent = '';

  if (ext === '.csv') {
    onProgress?.('Reading CSV file contents...');
    csvContent = await file.text();
  } else if (ext === '.xlsx' || ext === '.xls') {
    onProgress?.('Reading Excel worksheet...');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no worksheet');
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error('Unable to read worksheet');
    onProgress?.('Preparing spreadsheet rows...');
    csvContent = XLSX.utils.sheet_to_csv(ws);
  } else {
    throw new Error('Unsupported file format. Please upload .csv, .xlsx, or .xls');
  }

  onProgress?.('Analyzing rows for bulk chunking...');
  const lines = splitCsvLines(csvContent);

  if (lines.length <= 1) {
    return {
      isChunked: false,
      totalRows: 0,
      chunks: [
        {
          file,
          chunkIndex: 0,
          totalChunks: 1,
          startRow: 1,
          endRow: 1,
          rowCount: 0,
        },
      ],
    };
  }

  const header = lines[0];
  const dataRows = lines.slice(1);
  const totalRows = dataRows.length;

  // Small files (<= 20,000 rows) can be uploaded directly as original file
  if (totalRows <= chunkSize) {
    return {
      isChunked: false,
      totalRows,
      chunks: [
        {
          file,
          chunkIndex: 0,
          totalChunks: 1,
          startRow: 1,
          endRow: totalRows,
          rowCount: totalRows,
        },
      ],
    };
  }

  // Large dataset (> chunkSize rows, e.g. 3.5 lakh / 350,000 records)
  const totalChunks = Math.ceil(totalRows / chunkSize);
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < totalRows; i += chunkSize) {
    const chunkData = dataRows.slice(i, i + chunkSize);
    const chunkCsv = [header, ...chunkData].join('\n');
    const chunkIndex = Math.floor(i / chunkSize);
    const startRow = i + 1;
    const endRow = Math.min(i + chunkSize, totalRows);
    const chunkFileName = `${baseName}_part_${chunkIndex + 1}_of_${totalChunks}.csv`;

    const blob = new Blob([chunkCsv], { type: 'text/csv;charset=utf-8;' });
    const chunkFile = new File([blob], chunkFileName, { type: 'text/csv' });

    chunks.push({
      file: chunkFile,
      chunkIndex,
      totalChunks,
      startRow,
      endRow,
      rowCount: chunkData.length,
    });
  }

  return {
    isChunked: true,
    totalRows,
    chunks,
  };
}
