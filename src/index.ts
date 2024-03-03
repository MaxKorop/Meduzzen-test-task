import express, { json, Request, Response, Application } from "express";
import multer from "multer";
import cors from 'cors';
import dotenv from 'dotenv';
import { unlink } from 'node:fs';
import { parseXls } from "./readFile";
import { validateAndRespond } from "./validations";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;
// Configuring disk storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Configuring app
app.use(cors({ origin: "*" }));
app.use(json());

app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Missing a file to process" });
        if (!req.body.invoicingMonth) return res.status(400).json({ error: "Missing an invoicingMonth to process the file" });
        const data = await parseXls(req.file.filename);
        const validData = validateAndRespond(data, req.body.invoicingMonth);
        res.json({ ...validData });
        unlink('uploads/'+ req.file.filename, error => {
            if (error) console.log(error);
        });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Some error occurred on the server" });
        unlink('uploads/'+ req?.file?.filename, error => {
            if (error) console.log(error);
        });
        return;
    }
});

app.listen(port, () => console.log(`Server is running at port ${port}...`));