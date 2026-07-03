const path = require('node:path');

const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;

const XML_INVALID_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

let crcTable = null;

const escapeXml = (value) =>
  String(value ?? '')
    .replace(XML_INVALID_CHARACTERS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toAsciiPdfText = (value) =>
  String(value ?? '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const normalizeSheetName = (value, fallback) => {
  const normalized = String(value || fallback || 'Sheet')
    .replace(/[\[\]:*?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback || 'Sheet';
  }

  return normalized.slice(0, 31);
};

const columnIndexToName = (index) => {
  let current = index + 1;
  let name = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
};

const buildCellXml = (value, rowIndex, columnIndex) => {
  const cellReference = `${columnIndexToName(columnIndex)}${rowIndex + 1}`;

  if (value == null || value === '') {
    return `<c r="${cellReference}"/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${cellReference}"><v>${value}</v></c>`;
  }

  if (typeof value === 'boolean') {
    return `<c r="${cellReference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c r="${cellReference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const buildSheetXml = (rows) => {
  const rowXml = rows.map((columns, rowIndex) => {
    const cellXml = columns
      .map((value, columnIndex) => buildCellXml(value, rowIndex, columnIndex))
      .join('');

    return `<row r="${rowIndex + 1}">${cellXml}</row>`;
  }).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetData>',
    rowXml,
    '</sheetData>',
    '</worksheet>',
  ].join('');
};

const createCrcTable = () => {
  const table = new Array(256);

  for (let index = 0; index < 256; index += 1) {
    let current = index;

    for (let bit = 0; bit < 8; bit += 1) {
      current = (current & 1) === 1
        ? (0xEDB88320 ^ (current >>> 1))
        : (current >>> 1);
    }

    table[index] = current >>> 0;
  }

  return table;
};

const calculateCrc32 = (buffer) => {
  if (!crcTable) {
    crcTable = createCrcTable();
  }

  let crc = 0xFFFFFFFF;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = crcTable[(crc ^ buffer[index]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const getDosDateTime = (date = new Date()) => {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return {
    dosDate,
    dosTime,
  };
};

const createZipBuffer = (entries, now = new Date()) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.name, 'utf8');
    const contentBuffer = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, 'utf8');
    const crc32 = calculateCrc32(contentBuffer);
    const {
      dosDate,
      dosTime,
    } = getDosDateTime(now);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileNameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014B50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, fileNameBuffer);
    offset += localHeader.length + fileNameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054B50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    endRecord,
  ]);
};

const buildWorkbookXml = (sheets) => {
  const sheetXml = sheets.map((sheet, index) =>
    `<sheet name="${escapeXml(normalizeSheetName(sheet.name, `Sheet ${index + 1}`))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets>',
    sheetXml,
    '</sheets>',
    '</workbook>',
  ].join('');
};

const buildWorkbookRelsXml = (sheets) => {
  const relationshipXml = sheets.map((sheet, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    relationshipXml,
    '</Relationships>',
  ].join('');
};

const buildContentTypesXml = (sheetCount) => {
  const overrideXml = Array.from({
    length: sheetCount,
  }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    overrideXml,
    '</Types>',
  ].join('');
};

const buildXlsxBuffer = ({
  author = 'Net Viet Travel',
  generatedAt = new Date(),
  sheets = [],
  title = 'Business Report',
}) => {
  const normalizedSheets = (Array.isArray(sheets) ? sheets : [])
    .filter((sheet) => sheet && Array.isArray(sheet.rows))
    .map((sheet, index) => ({
      name: normalizeSheetName(sheet.name, `Sheet ${index + 1}`),
      rows: sheet.rows,
    }));

  if (normalizedSheets.length === 0) {
    normalizedSheets.push({
      name: 'Report',
      rows: [[title]],
    });
  }

  const generatedAtIso = new Date(generatedAt).toISOString();
  const zipEntries = [
    {
      name: '[Content_Types].xml',
      content: buildContentTypesXml(normalizedSheets.length),
    },
    {
      name: '_rels/.rels',
      content: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
        '</Relationships>',
      ].join(''),
    },
    {
      name: 'docProps/app.xml',
      content: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
        `<Application>${escapeXml(author)}</Application>`,
        '</Properties>',
      ].join(''),
    },
    {
      name: 'docProps/core.xml',
      content: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
        `<dc:creator>${escapeXml(author)}</dc:creator>`,
        `<dc:title>${escapeXml(title)}</dc:title>`,
        `<cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>`,
        `<dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(generatedAtIso)}</dcterms:created>`,
        `<dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(generatedAtIso)}</dcterms:modified>`,
        '</cp:coreProperties>',
      ].join(''),
    },
    {
      name: 'xl/workbook.xml',
      content: buildWorkbookXml(normalizedSheets),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: buildWorkbookRelsXml(normalizedSheets),
    },
    {
      name: 'xl/styles.xml',
      content: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>',
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>',
        '<borders count="1"><border/></borders>',
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>',
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
        '</styleSheet>',
      ].join(''),
    },
  ];

  normalizedSheets.forEach((sheet, index) => {
    zipEntries.push({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: buildSheetXml(sheet.rows),
    });
  });

  return createZipBuffer(zipEntries, new Date(generatedAt));
};

const buildPdfBuffer = ({
  lines = [],
  title = 'Business Report',
}) => {
  const pageLineLimit = 38;
  const pageLines = [];
  const normalizedLines = [
    title,
    '',
    ...(Array.isArray(lines) ? lines : []),
  ].map(toAsciiPdfText);

  for (let index = 0; index < normalizedLines.length; index += pageLineLimit) {
    pageLines.push(normalizedLines.slice(index, index + pageLineLimit));
  }

  if (pageLines.length === 0) {
    pageLines.push([
      toAsciiPdfText(title),
    ]);
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontObjectId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const pageObjectIds = [];

  for (const linesForPage of pageLines) {
    const textCommands = linesForPage.map((line, index) => {
      const y = 780 - (index * 18);
      return `BT /F1 11 Tf 40 ${y} Td (${line}) Tj ET`;
    }).join('\n');
    const streamObjectId = addObject(
      `<< /Length ${Buffer.byteLength(textCommands, 'utf8')} >>\nstream\n${textCommands}\nendstream`,
    );
    const pageObjectId = addObject(
      `<< /Type /Page /Parent PAGES_ID /MediaBox [0 0 595 842] /Contents ${streamObjectId} 0 R /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> >>`,
    );
    pageObjectIds.push(pageObjectId);
  }

  const pagesObjectId = addObject(
    `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((pageId) => `${pageId} 0 R`).join(' ')}] >>`,
  );
  const catalogObjectId = addObject(
    `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`,
  );

  const resolvedObjects = objects.map((objectContent) =>
    objectContent.replace(/PAGES_ID/g, `${pagesObjectId} 0 R`),
  );
  let pdfContent = '%PDF-1.4\n';
  const xrefOffsets = [0];

  resolvedObjects.forEach((objectContent, index) => {
    xrefOffsets.push(Buffer.byteLength(pdfContent, 'utf8'));
    pdfContent += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdfContent, 'utf8');
  pdfContent += `xref\n0 ${resolvedObjects.length + 1}\n`;
  pdfContent += '0000000000 65535 f \n';
  xrefOffsets.slice(1).forEach((offset) => {
    pdfContent += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdfContent += [
    'trailer',
    `<< /Size ${resolvedObjects.length + 1} /Root ${catalogObjectId} 0 R >>`,
    'startxref',
    String(xrefStart),
    '%%EOF',
  ].join('\n');

  return Buffer.from(pdfContent, 'utf8');
};

const buildWorkbookDescriptorSheet = ({
  name,
  rows,
}) => ({
  name: normalizeSheetName(name, 'Sheet'),
  rows: rows.map((row) => row.map((value) =>
    typeof value === 'string' ? value : value,
  )),
});

const buildReportHeaderRows = ({
  exportedBy,
  format,
  generatedAt,
  rangeLabel,
  reportTitle,
  timezone,
}) => [
  [reportTitle],
  [],
  ['Range', rangeLabel],
  ['Exported By', exportedBy],
  ['Generated At', generatedAt],
  ['Format', format],
  ['Timezone', timezone],
  [],
];

const flattenRowsToPdfLines = (rows) =>
  rows.map((row) => row.map((value) => String(value ?? '')).join(' | '));

const buildFileName = ({
  extension,
  from,
  reportType,
  timestamp,
  to,
}) => {
  const normalizedTimestamp = String(timestamp)
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
  const normalizedFrom = String(from || 'current').replace(/[^0-9A-Za-z_-]/g, '-');
  const normalizedTo = String(to || 'current').replace(/[^0-9A-Za-z_-]/g, '-');
  const normalizedReportType = String(reportType || 'report').replace(/[^0-9A-Za-z_-]/g, '-');
  const normalizedExtension = String(extension || path.extname(extension || '')).replace(/^\./, '') || 'bin';

  return `${normalizedReportType}-${normalizedFrom}-${normalizedTo}-${normalizedTimestamp}.${normalizedExtension}`;
};

module.exports = {
  buildFileName,
  buildPdfBuffer,
  buildReportHeaderRows,
  buildWorkbookDescriptorSheet,
  buildXlsxBuffer,
  flattenRowsToPdfLines,
  normalizeSheetName,
};
