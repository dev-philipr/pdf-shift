const express = require('express')
const path = require('path')
const fs = require('fs')
const Handlebars = require('handlebars')
const fetch = require('node-fetch')
const app = express()
const port = 2020
require('dotenv').config()

 const getTemplate = (template) => {
    const filePath = `C:/Users/imran/pdf-shift/pdf/templates/${template}.hbs` // NOTE: Change

    if (!fs.existsSync(filePath)) {
        throw new Error(`${template} template doesn't exist`);
    }

    return fs.readFileSync(filePath, 'utf8');
}

const sectionPartial = getTemplate('_section');
Handlebars.registerPartial('section', sectionPartial);
const patientInfoPartial = getTemplate('_patientInfo');
Handlebars.registerPartial('patientInfo', patientInfoPartial);

app.get('/', async (req, res) => {
        // build content
        const header = getTemplate('_header');
        const footer = getTemplate('_footer');
        const body = getTemplate('_body');
        const content = getTemplate('physician-order');
        const bodyCompiled = Handlebars.compile(content)({ orderDate: '2020-01-01', provider: 'John Doe MD', description: 'A description' }); // TODO: make data dynamic
        const html = Handlebars.compile(body)({ body: bodyCompiled });

        // send html to pdf shift to be converted to pdf
        const response = await fetch(process.env.PDFSHIFT_API_URL, {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64'),
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
                    right: 0,
                    left: 0,
                    top: 8
                },
                landscape: false,
                use_print: false,
                sandbox: true,
            }),
        });
        return response.body.pipe(res)

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})