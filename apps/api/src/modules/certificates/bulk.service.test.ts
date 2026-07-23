import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateManifestExcel } from './bulk-excel.service';
import ExcelJS from 'exceljs';

describe('bulk manifest validation', () => {
  test('validates standard correct excel data', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Manifest');

    sheet.addRow([
      'certificateNumber',
      'certificateType',
      'degreeTitle',
      'studentId',
      'studentName',
      'faculty',
      'studyProgram',
      'educationLevel',
      'issuedAt',
      'graduationDate',
      'pdf_file_name',
    ]);

    sheet.addRow([
      'UNDIP-2026-000001',
      'IJAZAH',
      'Sarjana Teknik',
      '240001',
      'Budi Santoso',
      'Fakultas Teknik',
      'Teknik Sipil',
      'S1',
      '2026-07-20',
      '2026-07-15',
      'UNDIP-2026-000001.pdf',
    ]);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parseAndValidateManifestExcel(buffer);

    assert.equal(result.totalRows, 1);
    assert.equal(result.validRows.length, 1);
    assert.equal(result.invalidRows.length, 0);
    assert.equal(result.validRows[0].certificateNumber, 'UNDIP-2026-000001');
    assert.equal(result.validRows[0].pdfFileName, 'UNDIP-2026-000001.pdf');
  });

  test('validates and lists errors for missing required fields', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Manifest');

    sheet.addRow([
      'certificateNumber',
      'certificateType',
      'degreeTitle',
      'studentId',
      'studentName',
      'faculty',
      'studyProgram',
      'educationLevel',
      'issuedAt',
      'graduationDate',
      'pdf_file_name',
    ]);

    sheet.addRow([
      '', // Missing certificateNumber
      'IJAZAH',
      'Sarjana Teknik',
      '240001',
      'Budi Santoso',
      'Fakultas Teknik',
      'Teknik Sipil',
      'S1',
      '2026-07-20',
      '2026-07-15',
      '', // Missing pdf_file_name
    ]);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parseAndValidateManifestExcel(buffer);

    assert.equal(result.totalRows, 1);
    assert.equal(result.validRows.length, 0);
    assert.equal(result.invalidRows.length, 1);
    assert.match(result.invalidRows[0].error, /certificateNumber is required/);
    assert.match(result.invalidRows[0].error, /pdf_file_name is required/);
  });
});
