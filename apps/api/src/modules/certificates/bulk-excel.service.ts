import ExcelJS from 'exceljs';
import { AppError } from '../../errors/AppError';

export type ParsedExcelRow = {
  readonly rowNumber: number;
  readonly certificateNumber: string;
  readonly pdfFileName: string;
  readonly certificateType: string;
  readonly degreeTitle: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly faculty: string;
  readonly studyProgram: string;
  readonly educationLevel: string;
  readonly issuedAt: string;
  readonly graduationDate: string;
};

export type ExcelValidationResult = {
  readonly validRows: ParsedExcelRow[];
  readonly invalidRows: Array<{
    readonly rowNumber: number;
    readonly error: string;
  }>;
  readonly totalRows: number;
};

function cleanCell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function formatDate(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

export async function parseAndValidateManifestExcel(
  buffer: Buffer
): Promise<ExcelValidationResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new AppError('File must be a valid Excel (.xlsx) file', 400);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new AppError('Excel workbook is empty', 400);
  }

  const headerRow = worksheet.getRow(1);
  const headers: Record<string, number> = {};

  headerRow.eachCell((cell, colNumber) => {
    const headerText = cleanCell(cell.value);
    if (headerText) {
      headers[headerText] = colNumber;
    }
  });

  const requiredHeaders = [
    'certificateNumber',
    'certificateType',
    'degreeTitle',
    'studentId',
    'studentName',
    'studyProgram',
    'educationLevel',
    'issuedAt',
    'pdf_file_name',
  ];

  const missingHeaders = requiredHeaders.filter((h) => !headers[h]);
  if (missingHeaders.length > 0) {
    throw new AppError(`Excel missing required headers: ${missingHeaders.join(', ')}`, 400);
  }

  const validRows: ParsedExcelRow[] = [];
  const invalidRows: Array<{ rowNumber: number; error: string }> = [];
  const seenCertNumbers = new Set<string>();
  const seenPdfNames = new Set<string>();

  let totalRows = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    totalRows++;

    const getVal = (header: string) => {
      const colIdx = headers[header];
      return colIdx ? cleanCell(row.getCell(colIdx).value) : '';
    };

    const certNum = getVal('certificateNumber');
    const pdfName = getVal('pdf_file_name');
    const certType = getVal('certificateType');
    const degreeTitle = getVal('degreeTitle');
    const studentId = getVal('studentId');
    const studentName = getVal('studentName');
    const faculty = getVal('faculty');
    const studyProgram = getVal('studyProgram');
    const educationLevel = getVal('educationLevel');
    const issuedAt = formatDate(getVal('issuedAt'));
    const graduationDate = formatDate(getVal('graduationDate'));

    // Check row validity
    const rowErrors: string[] = [];

    if (!certNum) rowErrors.push('certificateNumber is required');
    if (!pdfName) rowErrors.push('pdf_file_name is required');
    if (!certType) rowErrors.push('certificateType is required');
    if (!degreeTitle) rowErrors.push('degreeTitle is required');
    if (!studentId) rowErrors.push('studentId is required');
    if (!studentName) rowErrors.push('studentName is required');
    if (!studyProgram) rowErrors.push('studyProgram is required');
    if (!educationLevel) rowErrors.push('educationLevel is required');
    if (!issuedAt || !/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) {
      rowErrors.push('issuedAt must be valid date (YYYY-MM-DD)');
    }

    if (certNum) {
      if (seenCertNumbers.has(certNum)) {
        rowErrors.push(`Duplicate certificateNumber in manifest: ${certNum}`);
      } else {
        seenCertNumbers.add(certNum);
      }
    }

    if (pdfName) {
      if (seenPdfNames.has(pdfName)) {
        rowErrors.push(`Duplicate pdf_file_name in manifest: ${pdfName}`);
      } else {
        seenPdfNames.add(pdfName);
      }
    }

    if (rowErrors.length > 0) {
      invalidRows.push({
        rowNumber,
        error: rowErrors.join('; '),
      });
    } else {
      validRows.push({
        rowNumber,
        certificateNumber: certNum,
        pdfFileName: pdfName,
        certificateType: certType,
        degreeTitle,
        studentId,
        studentName,
        faculty,
        studyProgram,
        educationLevel,
        issuedAt,
        graduationDate,
      });
    }
  });

  return {
    validRows,
    invalidRows,
    totalRows,
  };
}
