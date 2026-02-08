import React, {useState, useCallback, useEffect, useRef} from 'react';

// 工具：安全格式化 JSON
const formatJson = (str) => {
    try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj, null, 4);
    } catch (e) {
        throw e;
    }
};

// 工具：压缩 JSON（移除多余空白）
const minifyJson = (str) => {
    try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj);
    } catch (e) {
        throw e;
    }
};

// 工具：定位 JSON 错误位置，并提取上下文
const locateJsonError = (str) => {
    try {
        JSON.parse(str);
        return null;
    } catch (err) {
        // 尝试从错误消息中提取 position（Chrome/Firefox 支持）
        const match = err.message.match(/at position (\d+)/);
        let position = -1;

        if (match) {
            position = parseInt(match[1], 10); // 0-based index
        } else {
            // 如果无法获取 position，回退到逐行估算（保留原逻辑简化版）
            const lines = str.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const testStr = lines.slice(0, i + 1).join('\n');
                try {
                    // 简单补全尝试
                    let completed = testStr;
                    const openBraces = (testStr.match(/{/g) || []).length - (testStr.match(/}/g) || []).length;
                    const openBrackets = (testStr.match(/\[/g) || []).length - (testStr.match(/]/g) || []).length;
                    completed += '}'.repeat(Math.max(0, openBraces)) + ']'.repeat(Math.max(0, openBrackets));
                    JSON.parse(completed);
                } catch {
                    // 假设错误在当前行末尾
                    position = testStr.length;
                    break;
                }
            }
        }

        if (position < 0 || position >= str.length) {
            position = str.length - 1;
        }

        // 提取上下文：前3个 + 当前 + 后3个
        const start = Math.max(0, position - 3);
        const end = Math.min(str.length, position + 4); // position+1 是下一个字符，+4 → 取3个后
        const contextBefore = str.slice(start, position);
        const errorChar = str.charAt(position) || '';
        const contextAfter = str.slice(position + 1, end);

        // 计算行号和列号（用于显示）
        const upToPos = str.slice(0, position);
        const line = upToPos.split('\n').length;
        const column = upToPos.split('\n').pop().length + 1;

        return {
            line,
            column,
            position,
            context: {
                before: contextBefore,
                char: errorChar,
                after: contextAfter,
            },
            rawMessage: err.message,
        };
    }
};
export default function JsonTool({content}) {
    // 判断content是否以{或[开头（忽略前面空格）
    const trimmedContent = content?.trim() || '';
    const isValidJsonStart = trimmedContent && (trimmedContent.startsWith('{') || trimmedContent.startsWith('['));
    
    console.log('🔧 JsonTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        isValidJsonStart,
        timestamp: Date.now()
    });

    // 如果content不以{或[开头，则不渲染组件内容
    if (!isValidJsonStart) {
        return null;
    }

    const [output, setOutput] = useState('');
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('format'); // 'format' | 'minify'
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 状态更新:', {mode, outputLength: output.length, hasError: !!error});

    // 处理JSON的核心函数
    const processJson = useCallback((inputContent = content, targetMode = mode) => {
        console.log('🚀 执行processJson:', {
            content: inputContent?.substring(0, 50) + '...',
            mode: targetMode,
            timestamp: Date.now()
        });

        setError(null);
        setOutput('');

        try {
            if (targetMode === 'format') {
                const formatted = formatJson(inputContent);
                setOutput(formatted);
            } else if (targetMode === 'minify') {
                const minified = minifyJson(inputContent);
                setOutput(minified);
            }
        } catch (err) {
            const location = locateJsonError(inputContent);
            setError({
                ...location,
                rawMessage: err.message,
            });
        }
    }, []);

    // 按钮点击处理函数 - 立即执行
    const handleModeChange = useCallback((newMode) => {
        console.log('🖱️ 按钮点击:', {newMode, content: content?.substring(0, 50) + '...'});
        setMode(newMode);
        // 立即执行，不防抖
        processJson(content, newMode);
    }, [content, processJson]);

    // 防抖处理content变化
    useEffect(() => {
        console.log('🎯 content变化监听:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        // 如果content没有变化或者为空，跳过处理
        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ content未变化或为空，跳过防抖处理');
            return;
        }

        console.log('🔍 防抖触发:', {content: content.substring(0, 50) + '...', mode, timestamp: Date.now()});

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            console.log('🧹 清除旧定时器:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // 设置新的防抖定时器
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ 防抖执行content变化:', {
                content: content.substring(0, 50) + '...',
                mode,
                timestamp: Date.now()
            });
            processJson(content, mode);
            // 更新最后处理的内容
            lastProcessedContentRef.current = content;
        }, 500);

        console.log('⏰ 设置新定时器:', debounceTimerRef.current, '延迟: 500ms');

        // 清理函数
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 组件卸载时清除定时器:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, mode, processJson]); // 监听content、mode和processJson变化

    return (
        <div>
            
            <div className="w-full max-w-4xl mx-auto p-4 border rounded">
                <h2 className="text-xl font-bold mb-4">JSON 格式化 & 压缩工具</h2>

                {/* 控制按钮 */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => handleModeChange('format')}
                        className={`px-3 py-1 rounded ${mode === 'format' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        格式化
                    </button>
                    <button
                        onClick={() => handleModeChange('minify')}
                        className={`px-3 py-1 rounded ${mode === 'minify' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        压缩
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mt-2 p-3 bg-red-100 text-red-800 rounded text-sm font-mono">
                        <strong>JSON 解析错误：</strong>
                        第 {error.line} 行，第 {error.column} 列
                        <br/>
                        <span className="text-gray-600">上下文: </span>
                        <span className="bg-yellow-200">{error.context.before}</span>
                        <span className="bg-red-300 font-bold">{error.context.char || '␣'}</span>
                        <span className="bg-yellow-200">{error.context.after}</span>
                        <br/>
                        <span className="text-xs text-gray-700">{error.rawMessage}</span>
                    </div>
                )}
                {/* 输出框 */}
                <div className="mt-4">
                    <h3 className="font-medium mb-1">结果：</h3>
                    <pre className="w-full h-40 p-2 bg-gray-100 border rounded overflow-auto font-mono text-sm">
                    {output || (error ? '—— 错误 ——' : '点击“处理”查看结果')}
                </pre>
                </div>
            </div>
        </div>
    );
}