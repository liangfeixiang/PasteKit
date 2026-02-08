import React, { useState, useCallback, useEffect, useRef } from 'react';

// 编码解码工具函数

// Base64 编码/解码
const encodeBase64 = (str) => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        throw new Error('Base64编码失败: ' + e.message);
    }
};

const decodeBase64 = (str) => {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        throw new Error('Base64解码失败: ' + e.message);
    }
};

// Hex 编码/解码
const encodeHex = (str) => {
    try {
        // 使用TextEncoder将字符串转换为UTF-8字节数组，然后转换为十六进制
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    } catch (e) {
        throw new Error('Hex编码失败: ' + e.message);
    }
};

const decodeHex = (hex) => {
    try {
        if (hex.length % 2 !== 0) {
            // 如果长度为奇数，前面补0
            hex = '0' + hex;
        }
        // 将十六进制字符串转换为字节数组，然后使用TextDecoder以UTF-8格式解码
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    } catch (e) {
        throw new Error('Hex解码失败: ' + e.message);
    }
};

// URL 编码/解码
const encodeUrl = (str) => {
    try {
        return encodeURIComponent(str);
    } catch (e) {
        throw new Error('URL编码失败: ' + e.message);
    }
};

const decodeUrl = (str) => {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        throw new Error('URL解码失败: ' + e.message);
    }
};

// Unicode 编码/解码
const encodeUnicode = (str) => {
    try {
        return Array.from(str)
            .map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))
            .join('');
    } catch (e) {
        throw new Error('Unicode编码失败: ' + e.message);
    }
};

const decodeUnicode = (str) => {
    try {
        return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    } catch (e) {
        throw new Error('Unicode解码失败: ' + e.message);
    }
};

// ASCII 编码/解码
const encodeAscii = (str) => {
    try {
        return Array.from(str)
            .map(char => char.charCodeAt(0).toString())
            .join(',');
    } catch (e) {
        throw new Error('ASCII编码失败: ' + e.message);
    }
};

const decodeAscii = (asciiStr) => {
    try {
        return asciiStr.split(',')
            .map(code => String.fromCharCode(parseInt(code, 10)))
            .join('');
    } catch (e) {
        throw new Error('ASCII解码失败: ' + e.message);
    }
};

// UTF-8 字节数组编码/解码
const encodeUtf8Bytes = (str) => {
    try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return Array.from(bytes).join(',');
    } catch (e) {
        throw new Error('UTF-8字节编码失败: ' + e.message);
    }
};

const decodeUtf8Bytes = (byteStr) => {
    try {
        const bytes = new Uint8Array(byteStr.split(',').map(b => parseInt(b, 10)));
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    } catch (e) {
        throw new Error('UTF-8字节解码失败: ' + e.message);
    }
};

// 格式检测函数
const detectFormat = (content) => {
    if (!content || typeof content !== 'string') return null;
    
    const trimmed = content.trim();
    
    // 检测 URL 编码 (%xx 格式) - 最高优先级
    if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
        try {
            decodeURIComponent(trimmed);
            return 'url';
        } catch {
            // 不是有效的URL编码
        }
    }
    
    // 检测 Unicode 编码 (\uxxxx 格式)
    if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) {
        return 'unicode';
    }
    
    // 检测逗号分隔的数字序列（ASCII码或UTF-8字节）
    if (/^(\d+,)*\d+$/.test(trimmed)) {
        // 进一步验证是否为有效的UTF-8字节值 (0-255)
        const bytes = trimmed.split(',').map(b => parseInt(b, 10));
        if (bytes.every(b => b >= 0 && b <= 255)) {
            // 所有数字都在0-255范围内，是UTF-8字节
            return 'utf8-bytes';
        } else {
            // 存在大于255或小于0的数字，按ASCII码处理
            return 'ascii';
        }
    }
    
    // 检测 Hex (只包含0-9, a-f, A-F 且长度为偶数)
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        // 根据项目规范，只要匹配^[0-9A-Fa-f]+$正则模式且长度为偶数就认为是Hex编码
        return 'hex';
    }
    
    // 检测 Base64 (只包含 A-Z, a-z, 0-9, +, /, = 且长度是4的倍数)
    // 强化验证：排除明显的JSON片段、XML标签和其他结构化数据
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        // 排除明显的结构化数据模式
        const jsonLikePattern = /[{}\[\]:,"']/;
        const xmlLikePattern = /<[a-zA-Z][^>]*>/;
        const htmlLikePattern = /<[^>]+>/;
        
        // 排除常见的非Base64模式
        const nonBase64Patterns = [
            /\{[^}]*\}/,  // JSON对象
            /\[[^\]]*\]/, // JSON数组
            /".*?:/,      // JSON键值对
            /<[^>]+>/,    // HTML/XML标签
            /\\u[0-9a-fA-F]{4}/, // Unicode转义
            /%[0-9A-Fa-f]{2}/     // URL编码
        ];
        
        // 检查是否匹配任何非Base64模式
        const hasNonBase64Pattern = nonBase64Patterns.some(pattern => pattern.test(trimmed));
        
        if (jsonLikePattern.test(trimmed) || xmlLikePattern.test(trimmed) || htmlLikePattern.test(trimmed) || hasNonBase64Pattern) {
            // 包含结构化数据特征，不太可能是Base64
            return 'plain';
        }
        
        try {
            atob(trimmed);
            return 'base64';
        } catch {
            // 不是有效的Base64
        }
    }
    
    return 'plain'; // 普通文本
};

// 获取所有支持的格式（排除原文本）
const getSupportedFormats = () => [
    { key: 'base64', name: 'Base64', encode: encodeBase64, decode: decodeBase64 },
    { key: 'hex', name: 'Hex', encode: encodeHex, decode: decodeHex },
    { key: 'url', name: 'URL编码', encode: encodeUrl, decode: decodeUrl },
    { key: 'unicode', name: 'Unicode', encode: encodeUnicode, decode: decodeUnicode },
    { key: 'ascii', name: 'ASCII码', encode: encodeAscii, decode: decodeAscii },
    { key: 'utf8-bytes', name: 'UTF-8字节', encode: encodeUtf8Bytes, decode: decodeUtf8Bytes }
];

export default function EncodeTool({ content }) {
    console.log('🔧 EncodeTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // 如果没有内容，不显示组件
    if (!content || content === undefined || content === null) {
        return null;
    }

    const [results, setResults] = useState({});
    const [error, setError] = useState(null);
    const [detectedFormat, setDetectedFormat] = useState(null);
    const [activeFormat, setActiveFormat] = useState('base64'); // 默认激活Base64
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 状态更新:', { detectedFormat, resultsCount: Object.keys(results).length, hasError: !!error });

    // 处理编码解码的核心函数
    const processEncoding = useCallback((inputContent = content) => {
        console.log('🚀 执行processEncoding:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setError(null);
        setResults({});

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                setResults({});
                return;
            }

            // 检测输入格式
            const detected = detectFormat(trimmedContent);
            setDetectedFormat(detected);

            const newResults = {};
            const formats = getSupportedFormats();

            // 对每种格式进行智能处理：根据输入内容决定编码还是解码
            formats.forEach(format => {
                const result = {
                    encodeSuccess: false,
                    decodeSuccess: false,
                    encoded: '',
                    decoded: '',
                    encodeError: '',
                    decodeError: '',
                    operation: '' // 记录实际执行的操作
                };

                // 智能判断：如果输入已经是目标格式，则执行解码；否则执行编码
                const isInputInTargetFormat = detected === format.key;
                
                if (isInputInTargetFormat && format.decode) {
                    // 输入内容已经是目标格式，执行解码
                    try {
                        result.decoded = format.decode(trimmedContent);
                        result.decodeSuccess = true;
                        result.operation = 'decode';
                    } catch (e) {
                        result.decodeError = e.message;
                    }
                } else if (!isInputInTargetFormat && format.encode) {
                    // 输入内容不是目标格式，执行编码
                    try {
                        result.encoded = format.encode(trimmedContent);
                        result.encodeSuccess = true;
                        result.operation = 'encode';
                    } catch (e) {
                        result.encodeError = e.message;
                    }
                }

                newResults[format.key] = result;
            });

            setResults(newResults);
            
            // 如果检测到Unicode、Hex、UTF-8字节、ASCII或URL格式，自动切换到对应标签页
            if (detected === 'unicode' || detected === 'hex' || detected === 'utf8-bytes' || detected === 'ascii' || detected === 'url') {
                setActiveFormat(detected);
            }
        } catch (err) {
            setError(err.message);
        }
    }, []);

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

        console.log('🔍 防抖触发:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            console.log('🧹 清除旧定时器:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // 设置新的防抖定时器
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ 防抖执行content变化:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processEncoding(content);
            // 更新最后处理的内容
            lastProcessedContentRef.current = content;
        }, 300); // 减少延迟以更快响应

        console.log('⏰ 设置新定时器:', debounceTimerRef.current, '延迟: 300ms');

        // 清理函数
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 组件卸载时清除定时器:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processEncoding]);

    // 初始处理
    useEffect(() => {
        if (content && content !== lastProcessedContentRef.current) {
            processEncoding(content);
            lastProcessedContentRef.current = content;
        }
    }, []); // 只在组件挂载时执行一次

    const formats = getSupportedFormats();

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-3">
                <h3 className="text-lg font-bold">编码解码工具</h3>
                
                {/* 检测到的格式 */}
                {detectedFormat && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        🔍 检测到输入格式: <strong>{formats.find(f => f.key === detectedFormat)?.name || detectedFormat}</strong>
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                        <strong>处理错误：</strong> {error}
                    </div>
                )}

                {/* 格式切换按钮 */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {formats.map(format => (
                        <button
                            key={format.key}
                            onClick={() => setActiveFormat(format.key)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                activeFormat === format.key
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {format.name}
                        </button>
                    ))}
                </div>

                {/* 结果展示 - 只显示当前选中的格式 */}
                <div className="space-y-3">
                    {(() => {
                        const format = formats.find(f => f.key === activeFormat);
                        const result = results[activeFormat];
                        
                        if (!format || !result) return null;

                        // 只有当编码成功或解码成功时才显示该格式
                        const shouldShow = result.encodeSuccess || result.decodeSuccess;
                        if (!shouldShow) return null;

                        return (
                            <div key={format.key} className="border rounded p-3">
                                <h4 className="font-medium text-sm mb-2 text-gray-700">{format.name}</h4>
                                
                                {/* 显示操作类型和结果 */}
                                {result.operation === 'encode' && result.encodeSuccess && (
                                    <div className="mb-2">
                                        <div className="text-xs text-gray-500 mb-1">🔄 编码结果 (原文本 → {format.name}):</div>
                                        <div className="text-xs font-mono bg-green-100 px-2 py-1 rounded break-all">
                                            {result.encoded}
                                        </div>
                                    </div>
                                )}

                                {result.operation === 'decode' && result.decodeSuccess && (
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">🔓 解码结果 ({format.name} → 原文本):</div>
                                        <div className="text-xs font-mono bg-blue-100 px-2 py-1 rounded break-all">
                                            {result.decoded}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* 空状态提示 */}
                {!detectedFormat && Object.keys(results).length === 0 && !error && (
                    <div className="text-center text-gray-500 py-4">
                        输入内容以查看编码解码结果
                    </div>
                )}

                {/* 当前格式无结果提示 */}
                {results[activeFormat] && !results[activeFormat].encodeSuccess && !results[activeFormat].decodeSuccess && (
                    <div className="text-center text-gray-500 py-4">
                        当前格式无法处理此内容
                    </div>
                )}
            </div>
        </div>
    );
}