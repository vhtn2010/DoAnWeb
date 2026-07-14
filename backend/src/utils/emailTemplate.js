const BRAND_NAME = 'Net Viet Travel';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const renderEmailParagraph = (value) => (
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(value)}</p>`
);

const renderEmailButton = ({
  href,
  label,
}) => {
  if (!href || !label) {
    return '';
  }

  return [
    '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;width:100%;">',
    '<tr>',
    '<td align="left">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#0f766e;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
};

const renderEmailCodeBlock = (value) => (
  [
    '<div style="margin:12px 0 0;padding:14px 16px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;">',
    `<code style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:13px;line-height:1.6;color:#0f172a;word-break:break-all;">${escapeHtml(value)}</code>`,
    '</div>',
  ].join('')
);

const renderEmailInfoRows = (rows = []) => {
  const normalizedRows = rows.filter((row) => row?.label && row?.value != null);

  if (normalizedRows.length === 0) {
    return '';
  }

  return [
    '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">',
    normalizedRows.map((row, index) => [
      `<tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">`,
      '<td style="width:38%;padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;">',
      escapeHtml(row.label),
      '</td>',
      '<td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;word-break:break-word;">',
      escapeHtml(row.value),
      '</td>',
      '</tr>',
    ].join('')).join(''),
    '</table>',
  ].join('');
};

const renderEmailSection = ({
  children,
  title,
}) => {
  if (!children) {
    return '';
  }

  return [
    '<div style="margin:22px 0 0;padding:18px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;">',
    title
      ? `<h3 style="margin:0 0 12px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;">${escapeHtml(title)}</h3>`
      : '',
    children,
    '</div>',
  ].join('');
};

const renderEmailCallout = (value) => (
  [
    '<div style="margin:22px 0 0;padding:14px 16px;border-left:4px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#78350f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">',
    escapeHtml(value),
    '</div>',
  ].join('')
);

const renderEmailLayout = ({
  badge,
  body = '',
  footerNote,
  greeting,
  intro = [],
  preheader,
  title,
}) => {
  const introHtml = intro.map(renderEmailParagraph).join('');

  return [
    '<!doctype html>',
    '<html lang="vi">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#eef4f2;font-family:Arial,Helvetica,sans-serif;">',
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
      : '',
    '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#eef4f2;">',
    '<tr>',
    '<td align="center" style="padding:28px 12px;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;">',
    '<tr>',
    '<td style="padding:18px 22px;border-radius:18px 18px 0 0;background:#0f172a;color:#ffffff;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">',
    '<tr>',
    `<td style="font-size:18px;font-weight:800;line-height:1.2;">${BRAND_NAME}</td>`,
    `<td align="right" style="font-size:12px;font-weight:700;text-transform:uppercase;color:#99f6e4;">${escapeHtml(badge || 'Thông báo')}</td>`,
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:30px 28px 26px;border:1px solid #d7e5df;border-top:0;border-radius:0 0 18px 18px;background:#ffffff;box-shadow:0 18px 40px rgba(15,23,42,0.08);">',
    title
      ? `<h1 style="margin:0 0 18px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;">${escapeHtml(title)}</h1>`
      : '',
    greeting ? renderEmailParagraph(greeting) : '',
    introHtml,
    body,
    footerNote ? renderEmailCallout(footerNote) : '',
    '<div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">',
    `Email này được gửi từ ${BRAND_NAME}. Nếu cần hỗ trợ, vui lòng liên hệ bộ phận CSKH.`,
    '</div>',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
};

module.exports = {
  escapeHtml,
  renderEmailButton,
  renderEmailCodeBlock,
  renderEmailInfoRows,
  renderEmailLayout,
  renderEmailParagraph,
  renderEmailSection,
};
