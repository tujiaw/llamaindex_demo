# 文档处理器使用指南

## 概述

生产级文档处理器，支持多种文档格式的智能解析。

## 支持的文档类型

### PDF 文档 (.pdf)
- **解析器**: PyMuPDFReader
- **特点**: 高质量文本提取、保留格式、表格结构识别
- **依赖**: pymupdf (已安装)

### Word 文档
- **.docx**: DocxReader - 现代Word格式
- **.doc**: LegacyOfficeReader - Word 97-2003格式（需要Java）
- **依赖**: python-docx (已安装)

### Excel 文档
- **.xlsx/.xls**: PandasExcelReader - 表格数据解析
- **.csv**: 直接文本解析
- **依赖**: pandas, openpyxl (已安装)

### PowerPoint 文档 (.pptx, .ppt)
- **解析器**: PptxReader
- **特点**: 提取幻灯片文本和备注
- **依赖**: python-pptx (已安装)

### 文本文档 (.txt, .md, .rst, .log)
- **解析器**: 直接文本读取
- **特点**: 多编码支持（UTF-8, GBK, GB2312, Latin-1）

### 其他格式 (.json, .html, .xml, .epub)
- **解析器**: SimpleDirectoryReader

## 使用方法

```python
from backend.app.services.document_processor import document_processor

# 处理文档
documents = await document_processor.process_file("path/to/file.pdf")

# 查看解析结果
for doc in documents:
    print(f"内容: {doc.text}")
    print(f"元数据: {doc.metadata}")
```

## 生产级特性

- ✓ 智能文档类型识别
- ✓ 多种解析器自动选择和降级
- ✓ 完善的错误处理和日志记录
- ✓ 丰富的元数据提取
- ✓ 可配置的文本分块策略
- ✓ 多编码支持
- ✓ 延迟加载读取器（优化内存）
- ✓ 异步处理支持

## 配置选项

```python
from backend.app.services.document_processor import DocumentProcessor

processor = DocumentProcessor(
    chunk_size=1024,        # 文本块大小
    chunk_overlap=200,       # 块重叠大小
    enable_metadata=True     # 启用元数据提取
)
```

## 可选依赖

### .doc 文件支持（Word 97-2003）
```bash
# 需要 Java 环境
uv pip install llama-index-readers-legacy-office
```

## 测试

```bash
# 运行功能测试
.venv/bin/python test_document_processor.py

# 运行解析示例
.venv/bin/python test_parse_example.py
```
