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
 * 将指定目录中的所有 WebP 文件转换为 PDF 文件
 * @param inputDir 输入目录路径，默认为当前目录
 * @param outputFileName 输出 PDF 文件名，默认为 'output.pdf'
 */
export async function convertWebPToPDF(inputDir: string = '.', outputFileName: string = 'output.pdf') {
  // 记录开始时间
  const startTime = Date.now();
  
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

  // 并行处理图片转换以提升性能
  const processImage = async (webpFile: string) => {
    // 使用JPEG格式以获得更好的压缩率和更小的文件大小
    const jpegBuffer = await sharp(webpFile)
      .resize({ width: 800, withoutEnlargement: true }) // 限制最大宽度为800px
      .jpeg({ 
        quality: 60,         // JPEG质量设置，平衡质量和文件大小
        progressive: false,  // 关闭渐进式加载
        mozjpeg: true        // 使用mozjpeg编码器获得更好的压缩
      })
      .toBuffer();
    
    return { jpegBuffer, filePath: webpFile };
  };

  // 分批并行处理，避免内存溢出
  // 减小批处理大小以避免内存问题
  const batchSize = Math.min(8, Math.max(3, Math.ceil(webpFiles.length / 10))); // 减小批处理大小防止内存溢出
  const processedImages = [];
  
  for (let i = 0; i < webpFiles.length; i += batchSize) {
    const batch = webpFiles.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processImage));
    processedImages.push(...batchResults);
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
    
    // 更新进度
    const processed = Math.min(i + batchSize, webpFiles.length);
    const percentage = (processed / webpFiles.length * 100).toFixed(2);
    spinner.text = `图片处理中... (${processed}/${webpFiles.length}) ${percentage}%`;
  }

  // 将处理好的图片添加到PDF，分批处理以避免内存问题
  spinner.text = '生成PDF中...';
  const pdfBatchSize = 10; // PDF生成批处理大小
  
  for (let i = 0; i < processedImages.length; i += pdfBatchSize) {
    const endIndex = Math.min(i + pdfBatchSize, processedImages.length);
    
    for (let j = i; j < endIndex; j++) {
       const { jpegBuffer } = processedImages[j];
       const jpegImage = await pdfDoc.embedJpg(jpegBuffer);

      // 计算图片缩放比以适应页面宽度
       const scaleFactor = pageWidth / jpegImage.width;
       const scaledHeight = jpegImage.height * scaleFactor;
      let offsetY = 0;

      // 将图片逐页绘制在 PDF 中
      while (offsetY < scaledHeight) {
        const page = pdfDoc.addPage([pageWidth, pageWidth]);
        page.drawImage(jpegImage, {
          x: 0,
          y: page.getHeight() - scaledHeight + offsetY,
          width: pageWidth,
          height: scaledHeight,
        });
        offsetY += page.getHeight(); // 更新偏移量
      }
      
      // 更新进度指示器文本为百分比
      const percentage = (((j + 1) / processedImages.length) * 100).toFixed(2);
      spinner.text = `生成PDF中... (${percentage}%)`;
    }
    
    // 每批处理后强制垃圾回收
    if (global.gc) {
      global.gc();
    }
  }

  // 保存 PDF 文件并更新进度指示器
  spinner.text = '正在保存 PDF 文件...';
  const pdfBytes = await pdfDoc.save();
  
  try {
    await fs.writeFile(targetFileName, pdfBytes);
    // 计算总耗时
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    spinner.succeed(`PDF 文件已生成，总耗时: ${duration}秒`);
  } catch (err: any) {
    // 计算总耗时
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    spinner.fail(`保存 PDF 文件时出错: ${err.message}，总耗时: ${duration}秒`);
  }
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
