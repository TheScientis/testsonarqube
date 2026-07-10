import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface ComplaintData {
    subject: string;
    recipient_title: string;
    recipient_office: string;
    location: string;
    time: string;
    violation_type: string;
    violation_description: string;
    legal_basis: string;
    reporter_name?: string;
}

export async function POST(request: Request) {
    let complaint: ComplaintData;
    try {
        complaint = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Request body must be JSON with complaint data (subject, recipient_title, recipient_office, location, time, violation_type, violation_description, legal_basis)' },
            { status: 400 }
        );
    }

    const required: (keyof ComplaintData)[] = ['subject', 'recipient_title', 'recipient_office', 'location', 'time', 'violation_type', 'violation_description', 'legal_basis'];
    for (const field of required) {
        if (!complaint[field]) {
            return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
        }
    }

    try {
        const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        const reporterLabel = complaint.reporter_name || 'Warga Pelapor';

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Surat Pengaduan</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; font-size: 14px; margin: 40px; }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .underline { text-decoration: underline; }
                .mt-4 { margin-top: 1rem; }
                .header-line { border-bottom: 2px solid black; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <span class="bold text-center" style="font-size: 16px;">SURAT PENGADUAN MASYARAKAT</span>
            </div>
            <div class="header-line"></div>
            
            <table style="width: 100%;" class="mt-4">
                <tr>
                    <td>Jakarta, ${today}</td>
                    <td style="text-align: right;">
                        Kepada Yth,<br/>
                        <span class="bold">${complaint.recipient_title}</span><br/>
                        ${complaint.recipient_office}
                    </td>
                </tr>
            </table>

            <div class="mt-4">
                <span class="bold underline">Perihal: ${complaint.subject}</span>
            </div>

            <div class="mt-4">
                <p>Dengan hormat,</p>
                <p>${complaint.violation_description}</p>
                
                <table style="margin-left: 20px;">
                    <tr><td width="150" class="bold">Lokasi:</td><td>${complaint.location}</td></tr>
                    <tr><td class="bold">Waktu:</td><td>${complaint.time}</td></tr>
                    <tr><td class="bold">Jenis Pelanggaran:</td><td>${complaint.violation_type}</td></tr>
                </table>

                <p class="mt-4">Tindakan tersebut diduga melanggar <span class="bold">${complaint.legal_basis}</span>.</p>
                <p>Sebagai bukti, saya lampirkan dokumentasi foto kejadian tersebut.</p>

                <p class="mt-4">Demikian surat pengaduan ini dibuat. Atas perhatian dan tindakannya, saya ucapkan terima kasih.</p>
                <p class="mt-4">Hormat kami,</p>
                <br/><br/>
                <p>___________________</p>
                <p>( ${reporterLabel} )</p>
            </div>
            
            <div style="position: absolute; bottom: 20px; width: 100%; text-align: center; font-size: 10px; color: gray;">
                Dokumen ini dihasilkan melalui asistensi Bang Jaga AI via WIWOKDETOK
            </div>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdf = await page.pdf({ format: 'A4' });
        await browser.close();

        return new NextResponse(pdf as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="Surat_Pengaduan.pdf"'
            }
        });
    } catch (e: any) {
        console.error('PDF Generation Error:', e);
        return new NextResponse(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
