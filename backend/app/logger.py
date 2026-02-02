import logging
import sys

def setup_logger():
    """配置并获取根 logger"""
    # 获取根 logger
    logger = logging.getLogger("llamaindex_demo")
    
    # 如果已经有 handler 说明已经配置过，直接返回
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)

    # 创建控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # 设置格式 - 包含时间、日志级别、模块名、行号、消息
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    console_handler.setFormatter(formatter)

    # 添加处理器到 logger
    logger.addHandler(console_handler)
    
    # 防止日志传播到父 logger (如果有的话)
    logger.propagate = False
    
    return logger

# 初始化全局 logger
logger = setup_logger()

def get_logger(name: str):
    """获取带子模块名称的 logger"""
    # 实际上我们使用统一的 logger 配置，这里只是为了方便扩展
    # 如果需要按模块区分，可以返回 logging.getLogger(f"llamaindex_demo.{name}")
    # 但为了简单和统一输出格式，我们直接返回配置好的 logger
    return logger
