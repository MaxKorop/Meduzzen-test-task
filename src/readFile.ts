import readXlsxFile, { Row } from "read-excel-file/node";

export const parseXls = async (filename: string): Promise<Row[]> => await readXlsxFile(`./uploads/${filename}`);