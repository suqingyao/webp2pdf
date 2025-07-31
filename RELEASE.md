# 发布指南

本项目提供了多种发布方式来自动管理版本号和发布流程。

## 🚀 交互式发布（推荐）

使用交互式发布工具，可以选择版本类型并确认发布：

```bash
pnpm release
```

该命令会：
1. 检查工作目录状态
2. 让你选择发布类型（patch/minor/major）
3. 显示新版本号预览
4. 确认后自动执行完整发布流程

## 📦 快速发布

如果你已经知道要发布的版本类型，可以直接使用：

### Patch 版本（修复bug）
```bash
pnpm release:patch
```

### Minor 版本（新功能）
```bash
pnpm release:minor
```

### Major 版本（破坏性更改）
```bash
pnpm release:major
```

## 🔄 发布流程

所有发布命令都会执行以下步骤：

1. **构建项目** - `pnpm build`
2. **运行测试** - `pnpm test`
3. **更新版本** - `pnpm version [type]`
4. **推送代码** - `git push`
5. **推送标签** - `git push --tags`
6. **发布到npm** - `pnpm publish`

## ⚠️ 发布前检查

在发布前，请确保：

- [ ] 所有更改已提交到git
- [ ] 代码已经过测试
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] 已登录npm账户 (`npm login`)

## 🛠️ 版本号规则

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **MAJOR** (主版本号): 不兼容的API修改
- **MINOR** (次版本号): 向下兼容的功能性新增
- **PATCH** (修订号): 向下兼容的问题修正

## 🔧 手动发布

如果需要手动控制发布流程：

```bash
# 1. 构建项目
pnpm build

# 2. 运行测试
pnpm test

# 3. 更新版本号
pnpm version patch  # 或 minor/major

# 4. 推送到git
git push && git push --tags

# 5. 发布到npm
pnpm publish
```

## 📝 发布后

发布成功后，你可以在以下地方查看：

- **npm**: https://www.npmjs.com/package/webp2pdf
- **GitHub Releases**: https://github.com/suqingyao/webp2pdf/releases

## 🚨 故障排除

### 发布失败

如果发布过程中出现错误：

1. 检查网络连接
2. 确认npm登录状态 (`npm whoami`)
3. 检查package.json中的版本号是否正确
4. 确认git仓库状态正常

### 版本回滚

如果需要回滚版本：

```bash
# 回滚git标签
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1

# 从npm撤销发布（仅限发布后24小时内）
npm unpublish webp2pdf@1.0.1
```

> ⚠️ **注意**: npm unpublish 有严格的限制，请谨慎使用。