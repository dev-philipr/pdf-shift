const express = require('express')
const path = require('path')
const fs = require('fs')
const Handlebars = require('handlebars')
const fetch = require('node-fetch')
const app = express()
const port = 2020

 const getTemplate = (template) => {
    const filePath = `/Users/philip/pdf-shift-test/pdf/templates/${template}.hbs` // NOTE: Change

    if (!fs.existsSync(filePath)) {
        throw new Error(`${template} template doesn't exist`);
    }

    return fs.readFileSync(filePath, 'utf8');
}

app.get('/', async (req, res) => {
        // build content
        const header = getTemplate('_header');
        const footer = getTemplate('_footer');
        const body = getTemplate('_body');
        const content = getTemplate('physician-order');
        const bodyCompiled = Handlebars.compile(content)({ orderDate: '2020-01-01', provider: 'John Doe MD', description: 'A description' }); // TODO: make data dynamic
        const html = Handlebars.compile(body)({ body: bodyCompiled });

        // send html to pdf shift to be converted to pdf
        const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`api:sk_0f39e1c659acfd6f0bb7bf709fb27b8783de3237`).toString('base64'),
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
        return response.body.pipe(res)

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})