import sharp from 'sharp';
import { cac } from 'cac';
import { PDFDocument } from 'pdf-lib';
import glob from 'fast-glob';
import fs from 'fs-extra';
import { resolve } from 'node:path';
import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';

const rootPath = process.cwd();

/**
 * 将指定目录中的所有 WebP 文件转换为 PDF 文件
 * @param inputDir 输入目录路径，默认为当前目录
 * @param outputFileName 输出 PDF 文件名，默认为 'output.pdf'
 */
export async function convertWebPToPDF(inputDir: string = '.', outputFileName: string = 'output.pdf') {
  const startTime = Date.now();
  const sourceDir = resolve(rootPath, inputDir);
  const targetFileName = resolve(rootPath, outputFileName);

  // 显示美观的标题
  console.log();
  console.log(chalk.cyan.bold('📄 WebP to PDF Converter'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log(chalk.blue(`📁 源目录: ${chalk.white(sourceDir)}`));
  console.log(chalk.blue(`📄 输出文件: ${chalk.white(targetFileName)}`));
  console.log();

  // 检查源目录是否存在
  if (!fs.pathExistsSync(sourceDir)) {
    console.log(chalk.red('❌ 指定的源目录不存在。'));
    return;
  }

  // 检查输出文件是否已存在
  if (fs.pathExistsSync(targetFileName)) {
    const { overwrite } = await inquirer.prompt({
      type: 'confirm',
      name: 'overwrite',
      message: chalk.yellow(`⚠️  文件 ${targetFileName} 已存在，是否覆盖？`),
      default: false,
    });

    if (!overwrite) {
      console.log(chalk.yellow('⏹️  操作已取消'));
      return;
    }
  }

  // 查找目录中的所有 WebP 文件
  console.log(chalk.blue('🔍 正在扫描 WebP 文件...'));
  const webpFiles = await glob(`${sourceDir}/**/*.webp`);
  if (webpFiles.length === 0) {
    console.log(chalk.red('❌ 指定目录下未找到 WebP 文件。'));
    return;
  }

  console.log(chalk.green(`✅ 找到 ${chalk.bold(webpFiles.length)} 个 WebP 文件`));
  console.log();

  // 创建新的 PDF 文档
  const pdfDoc = await PDFDocument.create();
  const tempPage = pdfDoc.addPage();
  const pageWidth = tempPage.getWidth();
  pdfDoc.removePage(0); // 移除临时页

  // 创建进度指示器
  const spinner = ora({
    text: chalk.blue('🚀 开始转换...'),
    color: 'cyan'
  }).start();

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
    const percentageNum = (processed / webpFiles.length * 100);
    const percentage = percentageNum.toFixed(1);
    const progressBar = '█'.repeat(Math.floor(percentageNum / 5)) + '░'.repeat(20 - Math.floor(percentageNum / 5));
    spinner.text = chalk.blue(`🖼️  图片处理中 ${chalk.cyan(`[${progressBar}]`)} ${chalk.yellow(percentage + '%')} ${chalk.gray(`(${processed}/${webpFiles.length})`)}`);
  }

  // 将处理好的图片添加到PDF，分批处理以避免内存问题
  spinner.text = chalk.blue('📄 开始生成 PDF 文档...');
  const pdfBatchSize = 10; // PDF生成批处理大小
  
  for (let i = 0; i < processedImages.length; i += pdfBatchSize) {
    const endIndex = Math.min(i + pdfBatchSize, processedImages.length);
    
    // 更新PDF生成进度
    const pdfProgressNum = (i / processedImages.length * 100);
    const pdfProgress = pdfProgressNum.toFixed(1);
    const pdfProgressBar = '█'.repeat(Math.floor(pdfProgressNum / 5)) + '░'.repeat(20 - Math.floor(pdfProgressNum / 5));
    spinner.text = chalk.blue(`📄 生成PDF中 ${chalk.cyan(`[${pdfProgressBar}]`)} ${chalk.yellow(pdfProgress + '%')} ${chalk.gray(`(${i}/${processedImages.length})`)}`);    
    
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
  spinner.text = chalk.blue('💾 正在保存 PDF 文件...');
  const pdfBytes = await pdfDoc.save();
  
  try {
    await fs.writeFile(targetFileName, pdfBytes);
    // 计算总耗时和文件大小
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const fileSizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(2);
    
    spinner.succeed(chalk.green(`✅ PDF 文件生成成功!`));
    console.log();
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.green(`📄 文件路径: ${chalk.white(targetFileName)}`));
    console.log(chalk.green(`📊 文件大小: ${chalk.white(fileSizeMB + ' MB')}`));
    console.log(chalk.green(`📷 图片数量: ${chalk.white(webpFiles.length + ' 张')}`));
    console.log(chalk.green(`⏱️  总耗时: ${chalk.white(duration + ' 秒')}`));
    console.log(chalk.gray('━'.repeat(50)));
    console.log();
  } catch (err: any) {
    // 计算总耗时
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    spinner.fail(chalk.red(`❌ 保存 PDF 文件时出错`));
    console.log();
    console.log(chalk.red(`错误信息: ${err.message}`));
    console.log(chalk.gray(`总耗时: ${duration} 秒`));
    console.log();
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
