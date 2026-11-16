import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { createSignedDownload, readLocalObject } from '../evidence/storage.js';
import { mapInvoiceDto } from './service.js';

export const invoicesRouter = Router();

invoicesRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.invoice.findMany({
      where: req.auth!.role === 'ops_admin' ? {} : { userId: req.auth!.userId },
      orderBy: { issuedAt: 'desc' },
      take: 100
    });
    res.json(rows.map(mapInvoiceDto));
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get('/:invoiceId/download', authRequired, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: String(req.params.invoiceId) } });
    if (!invoice || (req.auth!.role !== 'ops_admin' && invoice.userId !== req.auth!.userId)) {
      throw new HttpError(404, 'Invoice not found');
    }
    if (!invoice.pdfUrl) throw new HttpError(409, 'Invoice PDF is still being prepared');
    const signed = await createSignedDownload(invoice.pdfUrl);
    if (signed) return res.redirect(302, signed);
    const local = readLocalObject(invoice.pdfUrl);
    if (!local) throw new HttpError(404, 'Invoice PDF not found');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    res.type('application/pdf').send(local);
  } catch (error) {
    next(error);
  }
});
