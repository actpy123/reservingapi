import cache from '@libs/cache';
import { unzip } from '@utils/app.utils';
import { Request, Response } from 'express';
import * as Papa from 'papaparse';

export async function uploadAssumptions(req: Request, res: Response) {
  const assumptionFileZip = req.file as Express.Multer.File; // 👈 Type assertion here

  if (!assumptionFileZip) {
    return res.status(400).send('No file uploaded');
  }
  try {
    const extractedFiles = unzip(assumptionFileZip.buffer);
    cache.clear();

    for (const file of extractedFiles) {
      if (file.fileName.includes('.csv')) {
        const csvString = file.content.toString('utf8');
        const result = Papa.parse(csvString, {
          header: true, // First row as header
          skipEmptyLines: true,
        });
        cache.set(file.fileName, result.data);
      }
    }

    // You could process files here or send them back
    res.sendCustomResponse(200, {
      message: 'Files uploaded and stored in memory.',
      data: {
        files: 'cache.,',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to unzip file');
  }
}
