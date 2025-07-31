# Webp2PDF

`Webp2PDF` is a high-performance tool that converts all WebP files in a specified directory into a single optimized PDF file.

## Features

- 🚀 **High Performance**: Batch parallel processing with optimized memory management
- 📦 **Small File Size**: Uses JPEG compression with mozjpeg encoder for minimal PDF size
- 🖼️ **Smart Resizing**: Automatically resizes images to 800px width while maintaining aspect ratio
- 📊 **Progress Tracking**: Real-time progress indicator with percentage display
- 🔄 **Memory Efficient**: Batch processing with garbage collection to handle large image sets
- ⚡ **Fast Processing**: Optimized for speed with configurable batch sizes
- 🛡️ **Safe Operations**: Prompts for confirmation before overwriting existing files

## Installation

```sh
npm install -g webp2pdf
# or
pnpm install -g webp2pdf
```

## Usage

### Command Line Usage

```sh
webp2pdf [inputDir] [outputFileName]
```

**Parameters:**
- `[inputDir]` (optional): Directory containing WebP files (default: current directory)
- `[outputFileName]` (optional): Name of the output PDF file (default: `output.pdf`)

### Examples

```sh
# Convert WebP files in current directory to output.pdf
webp2pdf

# Convert WebP files in ./images directory to output.pdf
webp2pdf ./images

# Convert WebP files in ./images directory to custom.pdf
webp2pdf ./images custom.pdf

# Convert WebP files in specific path
webp2pdf /path/to/images result.pdf
```

## Performance Optimizations

- **JPEG Compression**: Uses JPEG format instead of PNG for 50-80% smaller file sizes
- **Batch Processing**: Processes images in configurable batches (3-8 images per batch)
- **Memory Management**: Automatic garbage collection after each batch
- **Image Optimization**: Smart resizing and quality optimization (60% JPEG quality)
- **Parallel Processing**: Concurrent image processing for faster conversion

## License

MIT