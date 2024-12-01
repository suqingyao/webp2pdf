import sharp from 'sharp';
import { cac } from 'cac';
import { PDFDocument } from 'pdf-lib';
import glob from 'fast-glob';
import fs from 'fs-extra';
import { resolve } from 'node:path';
import ora from 'ora';
import inquirer from 'inquirer';

const rootPath = process.cwd();

/**
 * 将指定目录中的所有 WebP 文件转换为 PDF 文件。
 * @param {string} inputDir - WebP 文件所在目录。
 * @param {string} outputFileName - 输出 PDF 文件名。
 */
export async function convertWebPToPDF(inputDir: string = '.', outputFileName: string = 'output.pdf') {
  const sourceDir = resolve(rootPath, inputDir);
  const targetFileName = resolve(sourceDir, outputFileName);

  // 检查源目录是否存在
  if (!fs.pathExistsSync(sourceDir)) {
    console.warn('输入路径不存在:', sourceDir);
    return;
  }

  // 检查输出文件是否已存在
  if (fs.pathExistsSync(targetFileName)) {
    const { overwrite } = await inquirer.prompt({
      type: 'confirm',
      name: 'overwrite',
      message: `文件 ${targetFileName} 已存在，是否覆盖？`,
      default: false,
    });

    if (!overwrite) {
      console.log('操作已取消');
      return;
    }
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

  // 创建进度指示器
  const spinner = ora('转换中...').start();

  for (const [index, webpFile] of webpFiles.entries()) {
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
    // 更新进度指示器文本为百分比
    const percentage = (((index + 1) / webpFiles.length) * 100).toFixed(2);
    spinner.text = `转换中... (${percentage}%)`;
  }

  // 保存 PDF 文件并更新进度指示器
  spinner.text = '正在保存 PDF 文件...';
  const pdfBytes = await pdfDoc.save();
  const writeStream = fs.createWriteStream(targetFileName);
  writeStream.write(pdfBytes);
  writeStream.end();

  writeStream.on('finish', () => {
    spinner.succeed('PDF 文件已生成');
  });

  writeStream.on('error', (err) => {
    spinner.fail(`保存 PDF 文件时出错: ${err.message}`);
  });
}

// 使用 cac 解析命令行参数
const cli = cac('webp-to-pdf');

cli
  .command('[inputDir] [outputFileName]', '将指定目录中的所有 WebP 文件转换为 PDF 文件')
  .action((inputDir = '.', outputFileName = 'output.pdf') => {
    convertWebPToPDF(inputDir, outputFileName);
  });

cli.help();
cli.parse();
