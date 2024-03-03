import { Row } from "read-excel-file/types";
import moment from 'moment';

type ResponseData = {
    InvoicingMonth?: string
    currencyRates?: Record<string, number>
    invoicesData?: Invoice[]
    [key: string]: any
}

type Invoice = {
    'Customer': string
    "Cust No'": string
    'Project Type': string
    'Quantity': number
    'Price Per Item': number
    'Item Price Currency': string
    'Total Price': number
    'Invoice Currency': string
    'Status': string
    'Invoice Total': number
    validationErrors: string[]
    [key: string]: any
}

// Validating document and generating response for client
export const validateAndRespond = (rows: Row[], invoicingMonth: string): ResponseData => {
    const response: ResponseData = {};
    if (validateDocumentStructure(rows)) {
        if (validateMonth(rows, invoicingMonth)) {
            response["InvoicingMonth"] = getDocumentMonth(rows).format("YYYY-MM");
            response["currencyRates"] = getCurrencyRates(rows);
            response["invoicesData"] = generateInvoices(...getFieldsAndRelevantInvoices(rows), response.currencyRates);
        } else {
            response.error = "Value of invoicingMonth doesn't match the invoicing month in the file";  
        }
    } else {
        response.error = "Invalid document structure";
    }
    return response;
}

const getCurrencyRates = (rows: Row[]): Record<string, number> => {
    const rowsWithCurrencyRates = rows.filter(row => row.some(cell => cell !== null && cell.toString().includes("Rate"))).map(row => row.filter(cell => cell !== null));
    return convertToCurrencyObject(rowsWithCurrencyRates);
}

const validateDocumentStructure = (rows: Row[]): boolean => {
    const currencyRatesRows = rows.slice(1).filter(row => row.some(cell => cell !== null && cell.toString().includes("Rate")));
    const [fields, relevantInvoices] = getFieldsAndRelevantInvoices(rows);
    // Checking that index of the first row of currency rates equals 1
    if (rows.indexOf(currencyRatesRows[0]) === 1) {
        // Checking that the index of the row with column labels is after the index of the last row with currency rates 
        // and that the rows with accounts are after it
        if (rows.indexOf(fields) === rows.indexOf(currencyRatesRows[currencyRatesRows.length - 1]) + 1 && rows.indexOf(relevantInvoices[0]) >= rows.indexOf(fields)) {
            return true;
        }
    }
    return false;
}

const generateInvoices = (fields: Row, relevantInvoices: Row[], currencyRates: Record<string, number>): Invoice[] => {
    return relevantInvoices.map(invoiceRow => {
        // Creating empty Invoice object
        const invoice: Invoice = {
            'Customer': '',
            "Cust No'": '',
            'Project Type': '',
            'Quantity': 0,
            'Price Per Item': 0,
            'Item Price Currency': '',
            'Total Price': 0,
            'Invoice Currency': '',
            'Status': '',
            'Invoice Total': 0,
            validationErrors: [],
        };
    
        fields.map((field, index) => {
            const value: any = invoiceRow[index];
            
            if (typeof invoice[field.toString()] === 'number' && typeof value !== "number") {
                invoice.validationErrors.push(`Field ${field} has invalid value: ${value}`);
            } else {
                invoice[field.toString()] = value;
            }
        });

        // Calculating Invoice Total
        if (currencyRates[invoice['Item Price Currency']] && currencyRates[invoice['Invoice Currency']]) {
            invoice['Invoice Total'] = (invoice['Total Price'] / currencyRates[invoice['Item Price Currency']]) * currencyRates[invoice['Invoice Currency']];
        } else {
            invoice.validationErrors.push('Invoice Total could not be calculated due to missing currency rates');
        }

        return invoice;
    });
}

const getFieldsAndRelevantInvoices = (rows: Row[]): [Row, Row[]] => {
    const invoicesFields = rows.filter(row => row.every(cell => cell !== null))[0];
    const statusFieldIndex = invoicesFields.indexOf("Status");
    const invoiceNFieldIndex = invoicesFields.indexOf("Invoice #");
    const relevantInvoices = rows.slice(rows.indexOf(invoicesFields) + 1).filter(row => row[statusFieldIndex] === "Ready" || row[invoiceNFieldIndex] !== null);
    return [invoicesFields, relevantInvoices];
}

// Validating that invoiceMonth from request and invoice month from document are equal
const validateMonth = (rows: Row[], month: string): Boolean => {
    return getDocumentMonth(rows).format("YYYY-MM-DD") === moment(month, ["MMM YYYY", "YYYY-MM"]).format("YYYY-MM-DD");
}

// Getting invoice month from document
const getDocumentMonth = (rows: Row[]): moment.Moment => {
    return moment(rows[0][0].toString(), ["MMM YYYY", "YYYY-MM"]);
}

// Converting currency rate from array to object
const convertToCurrencyObject = (currencyArray: any[]): Record<string, number> => {
    return currencyArray.reduce((result, [currency, rate]) => {
        result[currency.toString().replace(' Rate', '')] = rate;
        return result;
    }, {} as Record<string, number>);
};