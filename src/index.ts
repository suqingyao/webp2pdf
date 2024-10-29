import sharp from 'sharp';
import { program } from 'commander';
import { PDFDocument } from 'pdf-lib';
import glob from 'fast-glob';
import fs from 'fs-extra';
import { resolve } from 'node:path';

const rootPath = process.cwd();

/**
 * 将指定目录中的所有 WebP 文件转换为 PDF 文件。
 * @param {string} inputDir - WebP 文件所在目录。
 * @param {string} outputFileName - 输出 PDF 文件名。
 */
export async function convertWebPToPDF(inputDir, outputFileName) {
  const sourceDir = resolve(rootPath, inputDir);
  const targetFileName = resolve(sourceDir, outputFileName);

  // 检查源目录是否存在
  if (!fs.pathExistsSync(sourceDir)) {
    console.warn('输入路径不存在:', sourceDir);
    return;
  }

  // 查找目录中的所有 WebP 文件
  const webpFiles = await glob(`${sourceDir}/**/*.webp`);
  if (webpFiles.length === 0) {
    console.log('指定目录下未找到 WebP 文件。');
    return;
  }

  // 创建新的 PDF 文档
  const pdfDoc = await PDFDocument.create();
  const tempPage = pdfDoc.addPage();
  const pageWidth = tempPage.getWidth();
  pdfDoc.removePage(0); // 移除临时页

  for (const webpFile of webpFiles) {
    const imageBuffer = await fs.readFile(webpFile);
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    const pngImage = await pdfDoc.embedPng(pngBuffer);

    // 计算图片缩放比以适应页面宽度
    const scaleFactor = pageWidth / pngImage.width;
    const scaledHeight = pngImage.height * scaleFactor;
    let offsetY = 0;

    // 将图片逐页绘制在 PDF 中
    while (offsetY < scaledHeight) {
      const page = pdfDoc.addPage([pageWidth, pageWidth]);
      page.drawImage(pngImage, {
        x: 0,
        y: page.getHeight() - scaledHeight + offsetY,
        width: pageWidth,
        height: scaledHeight,
      });
      offsetY += page.getHeight(); // 更新偏移量
    }
  }

  // 保存 PDF 文件
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(targetFileName, pdfBytes);
  console.log(`PDF 文件已生成: ${targetFileName}`);
}

program
  .version('1.0.0')
  .description('将指定目录下的所有 WebP 文件转换为单个 PDF 文件')
  .option('-i, --input <directory>', '输入目录', process.cwd())
  .option('-o, --output <filename>', '输出的 PDF 文件名', 'output.pdf')
  .action((options) => {
    convertWebPToPDF(options.input, options.output);
  });

program.parse(process.argv);
