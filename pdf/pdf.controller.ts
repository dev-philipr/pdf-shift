import { AuthenticatedGuard } from '@/shared/auth/auth.strategy';
import { ActiveOrganization } from '@/shared/common/organization.decorator';
import { BadRequestException, Controller, Get, Header, HttpCode, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PDFService } from './pdf.service';

@Controller({
    version: '1',
    path: 'pdf',
})
export class PDFController {
    constructor(private readonly pdfService: PDFService) {}

    @Get('/form/:formId')
    @UseGuards(AuthenticatedGuard)
    @Header('Content-type', 'application/pdf')
    @HttpCode(200)
    async generatePDF(@Res() res: Response, @Param('formId') formId: string, @ActiveOrganization() organization: ActiveOrganization) {
        const stream = await this.pdfService.generatePDF(formId, organization.id);

        if (!stream) {
            throw new BadRequestException();
        }

        return stream.body?.pipe(res);
    }
}
