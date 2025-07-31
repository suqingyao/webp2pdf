#!/usr/bin/env node

import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * 执行命令并输出结果
 * @param {string} command - 要执行的命令
 * @param {string} description - 命令描述
 */
function runCommand(command, description) {
  console.log(chalk.blue(`🚀 ${description}...`));
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${description}完成`));
  } catch (error) {
    console.error(chalk.red(`❌ ${description}失败:`, error.message));
    process.exit(1);
  }
}

/**
 * 获取当前版本号
 * @returns {string} 当前版本号
 */
function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

/**
 * 计算新版本号
 * @param {string} currentVersion - 当前版本号
 * @param {string} releaseType - 发布类型 (patch/minor/major)
 * @returns {string} 新版本号
 */
function calculateNewVersion(currentVersion, releaseType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (releaseType) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      throw new Error(`未知的发布类型: ${releaseType}`);
  }
}

/**
 * 主发布流程
 */
async function release() {
  console.log();
  console.log(chalk.cyan.bold('📦 WebP2PDF 发布工具'));
  console.log(chalk.gray('━'.repeat(50)));
  
  const currentVersion = getCurrentVersion();
  console.log(chalk.blue(`📋 当前版本: ${chalk.white(currentVersion)}`));
  console.log();

  // 检查工作目录是否干净
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
  } catch (error) {
    console.log(chalk.yellow('⚠️  检测到未提交的更改'));
    const { shouldContinue } = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldContinue',
      message: '是否继续发布？建议先提交所有更改',
      default: false
    });
    
    if (!shouldContinue) {
      console.log(chalk.yellow('⏹️  发布已取消'));
      return;
    }
  }

  // 选择发布类型
  const { releaseType } = await inquirer.prompt({
    type: 'list',
    name: 'releaseType',
    message: '选择发布类型:',
    choices: [
      {
        name: `🔧 Patch (${calculateNewVersion(currentVersion, 'patch')}) - 修复bug`,
        value: 'patch'
      },
      {
        name: `✨ Minor (${calculateNewVersion(currentVersion, 'minor')}) - 新功能`,
        value: 'minor'
      },
      {
        name: `💥 Major (${calculateNewVersion(currentVersion, 'major')}) - 破坏性更改`,
        value: 'major'
      }
    ]
  });

  const newVersion = calculateNewVersion(currentVersion, releaseType);
  
  // 确认发布
  const { confirmRelease } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmRelease',
    message: `确认发布版本 ${chalk.green(newVersion)}？`,
    default: true
  });

  if (!confirmRelease) {
    console.log(chalk.yellow('⏹️  发布已取消'));
    return;
  }

  console.log();
  console.log(chalk.gray('━'.repeat(50)));
  console.log(chalk.cyan(`🚀 开始发布 v${newVersion}`));
  console.log(chalk.gray('━'.repeat(50)));
  console.log();

  // 执行发布流程
  runCommand('pnpm build', '构建项目');
  runCommand('pnpm test', '运行测试');
  runCommand(`pnpm version ${releaseType}`, '更新版本号');
  runCommand('git push', '推送代码');
  runCommand('git push --tags', '推送标签');
  runCommand('pnpm publish', '发布到 npm');

  console.log();
  console.log(chalk.gray('━'.repeat(50)));
  console.log(chalk.green.bold(`🎉 版本 v${newVersion} 发布成功!`));
  console.log(chalk.blue(`📦 npm: https://www.npmjs.com/package/webp2pdf`));
  console.log(chalk.blue(`🏷️  GitHub: https://github.com/suqingyao/webp2pdf/releases/tag/v${newVersion}`));
  console.log(chalk.gray('━'.repeat(50)));
  console.log();
}

// 运行发布流程
release().catch(error => {
  console.error(chalk.red('❌ 发布失败:'), error.message);
  process.exit(1);
});