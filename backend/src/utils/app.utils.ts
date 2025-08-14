import AdmZip from "adm-zip";

export function unzip(buffer: Buffer<ArrayBufferLike>) {
  try {
    const zip = new AdmZip(buffer);
    const extractedFiles = zip.getEntries().map((entry) => {
      return {
        fileName: entry.entryName,
        size: entry.header.size,
        content: entry.getData(), // Buffer of the file content
      };
    });

    return extractedFiles;
  } catch (err) {
    throw err;
  }
}
