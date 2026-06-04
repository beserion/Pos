import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: any[][];
}

/**
 * xlsx (SheetJS) kullanarak verileri yerel .xlsx dosyasında dışa aktarır.
 * Tek bir sayfa (sheet) veya birden fazla sayfa destekler.
 */
export const exportToExcel = (fileName: string, sheets: ExcelSheetData | ExcelSheetData[]) => {
  const wb = XLSX.utils.book_new();
  const sheetsArray = Array.isArray(sheets) ? sheets : [sheets];

  sheetsArray.forEach((sheetData) => {
    // Başlık satırı ve veri satırlarını birleştirir
    const data = [sheetData.headers, ...sheetData.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Sütun genişliklerini otomatik ayarlamak için basit bir uzunluk kontrolü
    const maxCols = sheetData.headers.length;
    const colWidths = Array(maxCols).fill({ wch: 15 }); // varsayılan genişlik 15 karakter
    
    // Verileri tarayıp en uzun hücre içeriğine göre sütun genişliği atar
    for (let c = 0; c < maxCols; c++) {
      let maxLen = String(sheetData.headers[c] || '').length;
      for (let r = 0; r < sheetData.rows.length; r++) {
        const val = sheetData.rows[r][c];
        const len = val !== null && val !== undefined ? String(val).length : 0;
        if (len > maxLen) {
          maxLen = len;
        }
      }
      colWidths[c] = { wch: Math.min(Math.max(maxLen + 3, 10), 50) }; // min 10, max 50
    }
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetData.name.substring(0, 31)); // Sayfa adı Excel limitasyonu nedeniyle maks 31 karakter
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export interface ThermalPrintData {
  title: string;
  subtitle?: string;
  dateStr?: string;
  cashierName?: string;
  headers: string[];
  rows: any[][];
  summaryItems?: { label: string; value: string; bold?: boolean }[];
  customBlocks?: { title: string; items: { label: string; value: string }[] }[];
}

/**
 * 80mm Termal yazıcılar için optimize edilmiş sanal bir fiş çıktısı hazırlar ve yazdırır.
 * İstemci tarafında çalışan gizli bir iframe oluşturup yazdırma tetikler.
 */
export const print80mmThermal = (data: ThermalPrintData) => {
  const trASCII = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${data.title}</title>
        <style>
            @page { margin: 0; size: 80mm auto; }
            body {
                font-family: 'Courier New', Courier, monospace;
                width: 270px; /* 80mm termal genişlik standardı */
                margin: 0 auto;
                padding: 10px 5px 30px 5px;
                color: #000;
                font-size: 10px;
                line-height: 1.3;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header { text-align: center; margin-bottom: 8px; }
            .title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .subtitle { font-size: 9px; margin-top: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .info-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
            
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9px; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-weight: bold; }
            td { padding: 3.5px 0; vertical-align: top; border-bottom: 1px dotted #bbb; }
            .right { text-align: right; }
            .center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            .totals { margin-top: 6px; }
            .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
            .total-row.bold { font-weight: bold; font-size: 11px; border-top: 1px dashed #000; padding-top: 4px; }
            
            .custom-block { margin-top: 8px; }
            .block-title { font-weight: bold; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1.5px; margin-bottom: 3px; }
            
            .footer { text-align: center; margin-top: 15px; font-size: 8px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">${trASCII(data.title)}</h1>
            ${data.subtitle ? `<div class="subtitle">${trASCII(data.subtitle)}</div>` : ''}
        </div>

        ${data.dateStr ? `
        <div class="info-row">
            <span>TARIH:</span>
            <span>${data.dateStr}</span>
        </div>` : ''}
        ${data.cashierName ? `
        <div class="info-row">
            <span>KULLANICI:</span>
            <span>${trASCII(data.cashierName)}</span>
        </div>` : ''}

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    ${data.headers.map((h, i) => {
                      const isLast = i === data.headers.length - 1;
                      const isFirst = i === 0;
                      const alignClass = isLast ? 'class="right"' : (!isFirst ? 'class="center"' : '');
                      return `<th ${alignClass}>${trASCII(h)}</th>`;
                    }).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.rows.map(row => `
                    <tr>
                        ${row.map((cell, i) => {
                          const isLast = i === row.length - 1;
                          const isFirst = i === 0;
                          const alignClass = isLast ? 'class="right"' : (!isFirst ? 'class="center"' : '');
                          const isBold = isFirst ? 'class="font-bold"' : '';
                          return `<td ${alignClass} ${isBold}>${trASCII(String(cell !== null && cell !== undefined ? cell : ''))}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${data.summaryItems && data.summaryItems.length > 0 ? `
            <div class="divider"></div>
            <div class="totals">
                ${data.summaryItems.map(item => `
                    <div class="total-row ${item.bold ? 'bold' : ''}">
                        <span>${trASCII(item.label)}</span>
                        <span>${item.value}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${data.customBlocks && data.customBlocks.length > 0 ? `
            ${data.customBlocks.map(block => `
                <div class="custom-block">
                    <div class="block-title">${trASCII(block.title)}</div>
                    ${block.items.map(item => `
                        <div class="info-row">
                            <span>${trASCII(item.label)}</span>
                            <span>${item.value}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        ` : ''}

        <div class="divider"></div>
        <div class="footer">
            <div>MALI DEGERI YOKTUR - BILGI FISIDIR</div>
            <div>PosNetX Raporlama</div>
        </div>

        <script>
            window.onload = function() {
                setTimeout(() => {
                    window.print();
                }, 250);
            }
        </script>
    </body>
    </html>
  `;

  // Gizli iframe oluşturup yazdırma işlemi
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
  }

  // Temizlik
  setTimeout(() => {
      if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
      }
  }, 10000);
};
