export interface PrintItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export interface PrintData {
    companyName: string;
    cashierName: string;
    date: Date;
    items: PrintItem[];
    totalAmount: number;
    paymentMethod: string;
    taxRate?: number;
    receiptNumber?: string;
}

export const printReceipt = (data: PrintData) => {
    const formattedDate = new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(data.date);

    const taxRate = data.taxRate || 10; // Default 10% KDV
    const taxAmount = data.totalAmount - (data.totalAmount / (1 + (taxRate / 100)));
    const subTotal = data.totalAmount - taxAmount;

    // Generate HTML for receipt (optimized for 80mm thermal printers)
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Satış Fişi - ${data.receiptNumber || '0000'}</title>
            <style>
                @page { margin: 0; }
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    width: 300px; /* ~80mm standard thermal width */
                    margin: 0 auto;
                    padding: 20px 10px;
                    color: #000;
                    font-size: 12px;
                    line-height: 1.4;
                    background: #fff;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .logo-text { font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase; }
                .sub-title { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .info-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
                
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; font-size: 10px; text-transform: uppercase; }
                th.right, td.right { text-align: right; }
                th.center, td.center { text-align: center; }
                td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
                .item-name { font-weight: bold; font-size: 11px; }
                .item-meta { font-size: 10px; color: #555; }
                
                .totals { margin-top: 15px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total-row.grand-total { font-size: 18px; font-weight: 900; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin: 10px 0; }
                
                .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #333; }
                .barcode { text-align: center; margin: 15px 0; font-family: 'Libre Barcode 39', monospace; font-size: 36px; }
                .payment-badge { display: inline-block; padding: 3px 8px; border: 1px solid #000; border-radius: 4px; font-weight: bold; font-size: 10px; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="logo-text">${data.companyName}</h1>
                <div class="sub-title">Teşekkür Ederiz</div>
            </div>

            <div class="info-row">
                <span>Tarih:</span>
                <span>${formattedDate}</span>
            </div>
            <div class="info-row">
                <span>Fiş No:</span>
                <span>${data.receiptNumber || Math.floor(100000 + Math.random() * 900000).toString()}</span>
            </div>
            <div class="info-row">
                <span>Kasiyer:</span>
                <span>${data.cashierName}</span>
            </div>

            <div class="divider"></div>

            <table>
                <thead>
                    <tr>
                        <th>Ürün</th>
                        <th class="center">Mkt</th>
                        <th class="right">Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(item => `
                        <tr>
                            <td>
                                <div class="item-name">${item.name}</div>
                                <div class="item-meta">${item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                            </td>
                            <td class="center font-bold" style="vertical-align: middle;">${item.quantity}</td>
                            <td class="right font-bold" style="vertical-align: middle;">${item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>Ara Toplam</span>
                    <span>${subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                </div>
                <div class="total-row">
                    <span>KDV (%${taxRate})</span>
                    <span>${taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                </div>
                <div class="total-row grand-total">
                    <span>GENEL TOPLAM</span>
                    <span>${data.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                </div>
            </div>

            <div class="info-row" style="margin-top:15px; align-items: center;">
                <span style="font-weight: bold;">Ödenen:</span>
                <span class="payment-badge">${data.paymentMethod === 'CASH' ? 'NAKİT' : 'KREDİ KARTI'}</span>
            </div>

            <div class="divider" style="margin-top: 20px;"></div>

            <div class="footer">
                <div>Mali Değeri Yoktur - Bilgi Fişidir</div>
                <div style="margin-top: 5px; font-weight: bold;">Powered by AntigravityPOS</div>
                <div class="barcode">*${Math.floor(10000000 + Math.random() * 90000000)}*</div>
            </div>

            <script>
                // Auto-print when loaded
                window.onload = function() {
                    window.print();
                    // Optional: Close window after printing in a real desktop env.
                    // setTimeout(() => window.close(), 500);
                }
            </script>
        </body>
        </html>
    `;

    // Create a hidden iframe for printing
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

    // Cleanup iframe after a reasonable time
    setTimeout(() => {
        if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }, 10000);
};
