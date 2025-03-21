import { ConfigService } from '@/shared/config/config.service';
import { DatasourceService } from '@/shared/datasource/datasource.service';
import { PhysicianOrderSchema } from '@musa/lib';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import fetch from 'node-fetch';
import path from 'path';
import { Physician } from '../entities/physician.entity';
import { VisitForm } from '../entities/visit-form.entity';

type Templates = '_header' | '_body' | '_footer' | 'physician-order';

// https://docs.pdfshift.io/#header-footer
// The footer and header are Independent from the rest of the document.
// As such, the CSS style defined in your body won't apply on your header/footer.
// To style your header/footer, you need to set a specific style either using <style> tag first, or adding style="" on your DOM elements.
// Headers and footers don't support tailwind
@Injectable()
export class PDFService {
    constructor(
        private readonly configService: ConfigService,
        private readonly datasourceService: DatasourceService,
    ) {}

    private getTemplate(template: Templates) {
        const filePath = path.resolve(__dirname, 'templates', `${template}.hbs`);

        if (!fs.existsSync(filePath)) {
            throw new BadRequestException(`${template} template doesn't exist`);
        }

        return fs.readFileSync(filePath, 'utf8');
    }

    async generatePDF(id: string, orgId: string) {
        const datasource = await this.datasourceService.getDatasource(orgId);
        const formRepo = datasource.getRepository(VisitForm);

        // fetch form data
        const form = await formRepo.findOneOrFail({
            where: { id },
            relations: {
                form: true,
            },
        });

        // build content
        const header = this.getTemplate('_header');
        const footer = this.getTemplate('_footer');
        const body = this.getTemplate('_body');
        const content = this.getTemplate('physician-order');
        const data = form.data as PhysicianOrderSchema['data']; // TODO: make schema dynamic
        const providerRepo = datasource.getRepository(Physician);
        const providerResponse = await providerRepo.findOneBy({ id: data.provider });
        const provider = providerResponse
            ? `${providerResponse?.firstName} ${providerResponse?.lastName} ${providerResponse?.credential}`
            : undefined;
        const bodyCompiled = Handlebars.compile(content)({ orderDate: data.orderDate, provider, description: data.description }); // TODO: make data dynamic
        const html = Handlebars.compile(body)({ body: bodyCompiled });

        // send html to pdf shift to be converted to pdf
        const response = fetch('https://api.pdfshift.io/v3/convert/pdf', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`api:${this.configService.get('pdf-shift.key')}`).toString('base64'),
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                source: html,
                header: {
                    source: header,
                    height: 50,
                    start_at: 1,
                },
                footer: {
                    source: footer,
                    height: 50,
                    start_at: 1,
                },
                margin: {
                    right: 40,
                    left: 40,
                },
                landscape: false,
                use_print: false,
                sandbox: true,
            }),
        });

        return response;
    }
}
